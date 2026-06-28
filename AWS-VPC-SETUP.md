# FloodGuard AWS VPC Infrastructure

**Created:** June 28, 2026  
**Region:** us-east-1  
**Status:** ✅ Active

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      FloodGuard VPC                              │
│                   CIDR: 10.0.0.0/16                              │
│                   vpc-07d2b4c43ff041146                          │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Internet Gateway (IGW)                        │  │
│  │            igw-009fc1d1086522ed5                           │  │
│  └───────────────────────┬───────────────────────────────────┘  │
│                          │                                        │
│  ┌───────────────────────┴───────────────────────────────────┐  │
│  │            Public Route Table                              │  │
│  │          rtb-098ce92c9770ac692                             │  │
│  │       Route: 0.0.0.0/0 → IGW                               │  │
│  └───────────┬─────────────────────┬─────────────────────────┘  │
│              │                     │                             │
│  ┌───────────▼──────────┐  ┌──────▼──────────────┐             │
│  │  Public Subnet 1a    │  │  Public Subnet 1b   │             │
│  │  10.0.1.0/24         │  │  10.0.2.0/24        │             │
│  │  us-east-1a          │  │  us-east-1b         │             │
│  │  subnet-0704ba19...  │  │  subnet-0dc2ca20... │             │
│  │                      │  │                     │             │
│  │  ┌──────────────┐    │  │                     │             │
│  │  │ NAT Gateway  │    │  │                     │             │
│  │  │ nat-02ce6b... │    │  │                     │             │
│  │  │ EIP: eipalloc-│    │  │                     │             │
│  │  │   0cdc1e689... │   │  │                     │             │
│  │  └──────┬───────┘    │  │                     │             │
│  └─────────┼────────────┘  └─────────────────────┘             │
│            │                                                     │
│  ┌─────────▼───────────────────────────────────────────────┐   │
│  │            Private Route Table                           │   │
│  │          rtb-01fd7f73af552278e                           │   │
│  │       Route: 0.0.0.0/0 → NAT Gateway                     │   │
│  └───────────┬─────────────────────┬────────────────────────┘   │
│              │                     │                             │
│  ┌───────────▼──────────┐  ┌──────▼──────────────┐             │
│  │  Private Subnet 1a   │  │  Private Subnet 1b  │             │
│  │  10.0.11.0/24        │  │  10.0.12.0/24       │             │
│  │  us-east-1a          │  │  us-east-1b         │             │
│  │  subnet-00229db6...  │  │  subnet-0adbb433... │             │
│  │                      │  │                     │             │
│  │  RDS Database        │  │  RDS Standby        │             │
│  │  (Primary)           │  │  (Multi-AZ)         │             │
│  └──────────────────────┘  └─────────────────────┘             │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## 📦 VPC Details

| Resource | Value |
|----------|-------|
| **VPC ID** | `vpc-07d2b4c43ff041146` |
| **CIDR Block** | `10.0.0.0/16` |
| **Region** | `us-east-1` |
| **DNS Hostnames** | Enabled |
| **DNS Resolution** | Enabled |

## 🌐 Internet Gateway

| Resource | Value |
|----------|-------|
| **IGW ID** | `igw-009fc1d1086522ed5` |
| **State** | Attached to VPC |
| **Purpose** | Provides internet access for public subnets |

## 🌉 NAT Gateway

| Resource | Value |
|----------|-------|
| **NAT Gateway ID** | `nat-02ce6b6994001b785` |
| **Elastic IP** | `eipalloc-0cdc1e689e7f481e1` |
| **Subnet** | Public Subnet 1a (us-east-1a) |
| **State** | Available |
| **Purpose** | Allows private subnets to access internet (for updates, etc.) |

## 🏠 Subnets

### Public Subnets (Internet-facing)
| Name | Subnet ID | CIDR | AZ | Auto-assign Public IP |
|------|-----------|------|----|-----------------------|
| Public-1a | `subnet-0704ba19e17cd3ddd` | 10.0.1.0/24 | us-east-1a | ✅ Yes |
| Public-1b | `subnet-0dc2ca207cee180e9` | 10.0.2.0/24 | us-east-1b | ✅ Yes |

**Use Cases:**
- Application Load Balancer
- NAT Gateway
- Bastion hosts
- Elastic Beanstalk web tier

### Private Subnets (Internal only)
| Name | Subnet ID | CIDR | AZ | Internet Access |
|------|-----------|------|----|-----------------------|
| Private-1a | `subnet-00229db6e6d13c216` | 10.0.11.0/24 | us-east-1a | Via NAT Gateway |
| Private-1b | `subnet-0adbb4338e964368d` | 10.0.12.0/24 | us-east-1b | Via NAT Gateway |

**Use Cases:**
- RDS PostgreSQL Database
- Backend application servers
- Lambda functions (if using VPC integration)
- ElastiCache (if added)

## 🛣️ Route Tables

### Public Route Table (`rtb-098ce92c9770ac692`)
| Destination | Target | Purpose |
|-------------|--------|---------|
| 10.0.0.0/16 | local | VPC internal routing |
| 0.0.0.0/0 | igw-009fc1d1086522ed5 | Internet access |

**Associated Subnets:**
- Public-1a (subnet-0704ba19e17cd3ddd)
- Public-1b (subnet-0dc2ca207cee180e9)

### Private Route Table (`rtb-01fd7f73af552278e`)
| Destination | Target | Purpose |
|-------------|--------|---------|
| 10.0.0.0/16 | local | VPC internal routing |
| 0.0.0.0/0 | nat-02ce6b6994001b785 | Outbound internet via NAT |

**Associated Subnets:**
- Private-1a (subnet-00229db6e6d13c216)
- Private-1b (subnet-0adbb4338e964368d)

## 🔒 Security Groups

### 1. Web Security Group (`sg-0d7db9709c3129f59`)
**Name:** FloodGuard-Web-SG  
**Purpose:** For ALB and frontend web servers

**Inbound Rules:**
| Protocol | Port | Source | Purpose |
|----------|------|--------|---------|
| TCP | 80 | 0.0.0.0/0 | HTTP traffic |
| TCP | 443 | 0.0.0.0/0 | HTTPS traffic |
| TCP | 3000 | 0.0.0.0/0 | Next.js dev server |
| TCP | 3001 | 0.0.0.0/0 | NestJS API |

**Outbound Rules:**
- All traffic allowed (default)

### 2. App Security Group (`sg-04e61c0f13297e3a1`)
**Name:** FloodGuard-App-SG  
**Purpose:** For backend application servers

**Inbound Rules:**
| Protocol | Port | Source | Purpose |
|----------|------|--------|---------|
| TCP | 3001 | sg-0d7db9709c3129f59 | Backend API from Web SG |
| TCP | 22 | 0.0.0.0/0 | SSH access (for debugging) |

**Outbound Rules:**
- All traffic allowed (default)

### 3. Database Security Group (`sg-01633b6bfc23f1cfc`)
**Name:** FloodGuard-DB-SG  
**Purpose:** For RDS PostgreSQL database

**Inbound Rules:**
| Protocol | Port | Source | Purpose |
|----------|------|--------|---------|
| TCP | 5432 | sg-04e61c0f13297e3a1 | PostgreSQL from App SG |
| TCP | 5432 | sg-0d7db9709c3129f59 | PostgreSQL from Web SG |

**Outbound Rules:**
- All traffic allowed (default)

## 💰 Cost Estimation

**Monthly Costs (Approximate):**

| Resource | Cost |
|----------|------|
| VPC | Free |
| Subnets | Free |
| Internet Gateway | Free |
| **NAT Gateway** | ~$32.40/month |
| **Elastic IP (NAT)** | Free (while attached) |
| Route Tables | Free |
| Security Groups | Free |
| **Data Transfer (NAT)** | ~$0.045/GB processed |

**Estimated Total:** ~$35-50/month (depending on data transfer)

> **Note:** NAT Gateway is the primary cost. For cost savings, consider:
> - Single NAT Gateway (current setup) vs one per AZ
> - NAT Instance as alternative (more management)
> - VPC Endpoints for AWS services (reduce NAT traffic)

## 🎯 Next Steps

### 1. Create RDS Database
```bash
# DB Subnet Group in private subnets
# Multi-AZ deployment for high availability
# Security Group: sg-01633b6bfc23f1cfc
```

### 2. Deploy Elastic Beanstalk Environments

#### Frontend (Next.js)
- **Environment:** FloodGuard-Frontend-Prod
- **Subnets:** Public subnets (for ALB) + Private subnets (for instances)
- **Security Group:** sg-0d7db9709c3129f59
- **Load Balancer:** Application Load Balancer
- **Instance Type:** t3.medium
- **Auto Scaling:** 2-4 instances

#### Backend (NestJS)
- **Environment:** FloodGuard-Backend-Prod
- **Subnets:** Public subnets (for ALB) + Private subnets (for instances)
- **Security Group:** sg-04e61c0f13297e3a1
- **Load Balancer:** Application Load Balancer
- **Instance Type:** t3.small
- **Auto Scaling:** 2-4 instances

### 3. Additional AWS Services

- **S3:** For file uploads (flood reports, images)
- **SNS:** For SMS/email notifications
- **SES:** For email alerts
- **CloudWatch:** For monitoring and logging
- **Lambda:** For serverless functions (flood prediction, etc.)
- **API Gateway:** Optional REST API gateway

## 📝 Configuration File

All VPC configuration is saved in:
```
vpc-config.json
```

## 🔧 AWS CLI Commands

### View VPC Details
```bash
aws ec2 describe-vpcs --vpc-ids vpc-07d2b4c43ff041146
```

### View Subnets
```bash
aws ec2 describe-subnets --filters "Name=vpc-id,Values=vpc-07d2b4c43ff041146"
```

### View Security Groups
```bash
aws ec2 describe-security-groups --filters "Name=vpc-id,Values=vpc-07d2b4c43ff041146"
```

### View NAT Gateway Status
```bash
aws ec2 describe-nat-gateways --nat-gateway-ids nat-02ce6b6994001b785
```

### View Route Tables
```bash
aws ec2 describe-route-tables --filters "Name=vpc-id,Values=vpc-07d2b4c43ff041146"
```

## ⚠️ Important Notes

1. **NAT Gateway Costs:** The NAT Gateway charges by the hour and data processed. Monitor usage in CloudWatch.

2. **Security Group Best Practices:**
   - Currently SSH (port 22) is open to 0.0.0.0/0 for debugging
   - **For production:** Restrict SSH to your IP only
   - Consider using AWS Systems Manager Session Manager instead

3. **Multi-AZ Deployment:**
   - Subnets are spread across 2 AZs (1a and 1b)
   - For production, deploy resources across both AZs
   - RDS should use Multi-AZ deployment

4. **Backup and Disaster Recovery:**
   - VPC configuration is saved in `vpc-config.json`
   - Export security group rules regularly
   - Document any manual changes

## 🔐 Security Checklist

- ✅ Private subnets for database
- ✅ Security groups with least privilege
- ✅ NAT Gateway for outbound-only internet
- ⚠️ SSH restricted to 0.0.0.0/0 (change in production!)
- ✅ No database ports exposed to internet
- ✅ VPC Flow Logs (should be enabled)
- ✅ Multi-AZ setup

## 📞 Support

For issues or questions about the VPC setup:
1. Check CloudWatch Logs
2. Review VPC Flow Logs
3. Check Security Group rules
4. Verify Route Table associations

---

**Infrastructure Status:** ✅ Production Ready  
**Last Updated:** June 28, 2026  
**Managed By:** FloodGuard DevOps Team
