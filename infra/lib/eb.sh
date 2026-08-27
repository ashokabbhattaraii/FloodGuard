#!/usr/bin/env bash
# Elastic Beanstalk helpers shared by the backend and frontend deploy steps.

# Build the --option-settings JSON for an environment.
# Emitted as a file because the list is long enough to hit ARG_MAX concerns and
# is far easier to inspect when a deploy misbehaves.
eb_option_settings() {
  local env_type="$1" instance_type="$2" health_path="$3" extra_env_json="$4" out="$5"
  state_require VPC_ID SUBNET_A SUBNET_B EB_SG EB_SERVICE_ROLE EB_INSTANCE_PROFILE

  local base
  base="$(jq -n \
    --arg profile "$EB_INSTANCE_PROFILE" \
    --arg svcrole "$EB_SERVICE_ROLE" \
    --arg itype "$instance_type" \
    --arg sg "$EB_SG" \
    --arg vpc "$VPC_ID" \
    --arg subnets "${SUBNET_A},${SUBNET_B}" \
    --arg envtype "$env_type" \
    --arg hpath "$health_path" \
    --arg minsz "$EB_MIN_INSTANCES" \
    --arg maxsz "$EB_MAX_INSTANCES" \
    '[
      {Namespace:"aws:autoscaling:launchconfiguration", OptionName:"IamInstanceProfile", Value:$profile},
      {Namespace:"aws:autoscaling:launchconfiguration", OptionName:"InstanceType",       Value:$itype},
      {Namespace:"aws:autoscaling:launchconfiguration", OptionName:"SecurityGroups",     Value:$sg},
      {Namespace:"aws:elasticbeanstalk:environment",    OptionName:"ServiceRole",        Value:$svcrole},
      {Namespace:"aws:elasticbeanstalk:environment",    OptionName:"EnvironmentType",    Value:$envtype},
      {Namespace:"aws:ec2:vpc",                         OptionName:"VPCId",              Value:$vpc},
      {Namespace:"aws:ec2:vpc",                         OptionName:"Subnets",            Value:$subnets},
      {Namespace:"aws:ec2:vpc",                         OptionName:"AssociatePublicIpAddress", Value:"true"},
      {Namespace:"aws:autoscaling:asg",                 OptionName:"MinSize",            Value:$minsz},
      {Namespace:"aws:autoscaling:asg",                 OptionName:"MaxSize",            Value:$maxsz},
      {Namespace:"aws:elasticbeanstalk:healthreporting:system", OptionName:"SystemType",  Value:"enhanced"},
      {Namespace:"aws:elasticbeanstalk:environment:process:default", OptionName:"HealthCheckPath", Value:$hpath},
      {Namespace:"aws:elasticbeanstalk:command",        OptionName:"Timeout",            Value:"1800"},
      {Namespace:"aws:elasticbeanstalk:xray",           OptionName:"XRayEnabled",        Value:"true"}
    ]')"

  # A LoadBalanced env additionally needs an ALB across both AZ subnets.
  if [[ "$env_type" == "LoadBalanced" ]]; then
    base="$(jq --arg subnets "${SUBNET_A},${SUBNET_B}" '. + [
      {Namespace:"aws:elasticbeanstalk:environment", OptionName:"LoadBalancerType", Value:"application"},
      {Namespace:"aws:ec2:vpc", OptionName:"ELBScheme", Value:"public"},
      {Namespace:"aws:ec2:vpc", OptionName:"ELBSubnets", Value:$subnets}
    ]' <<<"$base")"
  fi

  # Application env vars last so they can override anything above.
  jq --argjson extra "$extra_env_json" '. + $extra' <<<"$base" > "$out"
}

# Turn a KEY=VALUE map (as JSON object) into EB application:environment settings.
eb_env_settings() {
  jq -n --argjson kv "$1" '
    $kv | to_entries | map({
      Namespace: "aws:elasticbeanstalk:application:environment",
      OptionName: .key,
      Value: (.value | tostring)
    })'
}

# Upload a bundle and register it as an application version.
eb_publish_version() {
  local app="$1" zip="$2" label="$3"
  state_require S3_ARTIFACTS
  local key="${app}/${label}.zip"

  aws s3 cp "$zip" "s3://${S3_ARTIFACTS}/${key}" --only-show-errors
  ok "uploaded s3://${S3_ARTIFACTS}/${key} ($(du -h "$zip" | cut -f1))" >&2

  if aws elasticbeanstalk describe-application-versions --application-name "$app" \
       --version-labels "$label" --query 'ApplicationVersions[0].VersionLabel' \
       --output text 2>/dev/null | grep -qw "$label"; then
    skip "application version $label" >&2
  else
    aws elasticbeanstalk create-application-version \
      --application-name "$app" --version-label "$label" \
      --source-bundle "S3Bucket=${S3_ARTIFACTS},S3Key=${key}" \
      --process >/dev/null
    ok "created application version $label" >&2
  fi
  printf '%s' "$label"
}

eb_env_status() {
  aws elasticbeanstalk describe-environments --environment-names "$1" \
    --query 'Environments[?Status!=`Terminated`].Status' --output text 2>/dev/null
}

eb_wait_ready() {
  local env="$1"
  wait_for "$env to reach Ready" 1800 bash -c \
    "[[ \"\$(aws elasticbeanstalk describe-environments --environment-names '$env' \
        --query 'Environments[?Status!=\`Terminated\`].Status' --output text)\" == 'Ready' ]]"
}
