# Complete AWS VPC Setup Guide for FloodGuard

**Version:** 1.0  
**Last Updated:** June 28, 2026  
**Difficulty:** Intermediate  
**Estimated Time:** 45-60 minutes

---

## 📚 Table of Contents

1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Architecture Overview](#architecture-overview)
4. [Part 1: Create VPC](#part-1-create-vpc)
5. [Part 2: Create Internet Gateway](#part-2-create-internet-gateway)
6. [Part 3: Create Subnets](#part-3-create-subnets)
7. [Part 4: Create Route Tables](#part-4-create-route-tables)
8. [Part 5: Create NAT Gateway](#part-5-create-nat-gateway)
9. [Part 6: Create Security Groups](#part-6-create-security-groups)
10. [Verification Steps](#verification-steps)
11. [Troubleshooting](#troubleshooting)
12. [Cost Optimization](#cost-optimization)
13. [Security Best Practices](#security-best-practices)
14. [Cleanup Instructions](#cleanup-instructions)
15. [Next Steps](#next-steps)

---

## Introduction

### What is a VPC?

**VPC (Virtual Private Cloud)** is a logically isolated section of the AWS cloud where you can launch AWS resources in a virtual network that you define. Think of it as your own private data center in the cloud.

### Why Do We Need a VPC?

For the FloodGuard application, we need:
- **Isolation**: Separate our application from other AWS customers
- **Security**: Control inbound and outbound traffic
- **High Availability**: Spread resources across multiple availability zones
- **Scalability**: Easily add more resources as needed

### What We'll Build

```
Internet Users
      ↓
Internet Gateway (Public Access)
      ↓
Public Subnets (ALB, NAT Gateway)
      ↓
Private Subnets (App Servers, Database)
      ↓
NAT Gateway (Outbound Internet for Updates)
```

---

## Prerequisites

### Required Access

- ✅ AWS Account with Administrator access
- ✅ AWS CLI installed (for CLI method)
- ✅ Basic understanding of networking concepts

### AWS CLI Installation

**macOS:**
```bash
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /
```

**Linux:**
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

**Windows:**
```powershell
# Download from: https://awscli.amazonaws.com/AWSCLIV2.msi
# Run the installer
```

**Verify Installation:**
```bash
aws --version
# Output: aws-cli/2.x.x Python/3.x.x ...
```

### Configure AWS CLI

```bash
aws configure
```

Enter:
- **AWS Access Key ID**: [Your Access Key]
- **AWS Secret Access Key**: [Your Secret Key]
- **Default region name**: `us-east-1`
- **Default output format**: `json`

### Verify Configuration

```bash
aws sts get-caller-identity
```

Expected output:
```json
{
    "UserId": "AIDAXXXXXXXXXXXXX",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/your-username"
}
```

---

## Architecture Overview

### Network Diagram

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
│                          │                                        │
│  ┌───────────────────────┴───────────────────────────────────┐  │
│  │            Public Route Table                              │  │
│  │       Route: 0.0.0.0/0 → IGW                               │  │
│  └───────────┬─────────────────────┬─────────────────────────┘  │
│              │                     │                             │
│  ┌───────────▼──────────┐  ┌──────▼──────────────┐             │
│  │  Public Subnet 1a    │  │  Public Subnet 1b   │             │
│  │  10.0.1.0/24         │  │  10.0.2.0/24        │             │
│  │  us-east-1a          │  │  us-east-1b         │             │
│  │                      │  │                     │             │
│  │  - Load Balancer     │  │  - Load Balancer    │             │
│  │  - NAT Gateway       │  │                     │             │
│  │  - Bastion Host      │  │                     │             │
│  └──────────┬───────────┘  └─────────────────────┘             │
│             │                                                    │
│             │ NAT Gateway                                        │
│             ▼                                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │            Private Route Table                            │  │
│  │       Route: 0.0.0.0/0 → NAT Gateway                      │  │
│  └───────────┬─────────────────────┬────────────────────────┘  │
│              │                     │                            │
│  ┌───────────▼──────────┐  ┌──────▼──────────────┐            │
│  │  Private Subnet 1a   │  │  Private Subnet 1b  │            │
│  │  10.0.11.0/24        │  │  10.0.12.0/24       │            │
│  │  us-east-1a          │  │  us-east-1b         │            │
│  │                      │  │                     │            │
│  │  - RDS Primary       │  │  - RDS Standby      │            │
│  │  - App Servers       │  │  - App Servers      │            │
│  └──────────────────────┘  └─────────────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### IP Address Planning

| Resource | CIDR Block | IP Range | Available IPs | Purpose |
|----------|------------|----------|---------------|---------|
| **VPC** | 10.0.0.0/16 | 10.0.0.0 - 10.0.255.255 | 65,536 | Entire network |
| **Public Subnet 1a** | 10.0.1.0/24 | 10.0.1.0 - 10.0.1.255 | 251* | Web tier (AZ-a) |
| **Public Subnet 1b** | 10.0.2.0/24 | 10.0.2.0 - 10.0.2.255 | 251* | Web tier (AZ-b) |
| **Private Subnet 1a** | 10.0.11.0/24 | 10.0.11.0 - 10.0.11.255 | 251* | Database (AZ-a) |
| **Private Subnet 1b** | 10.0.12.0/24 | 10.0.12.0 - 10.0.12.255 | 251* | Database (AZ-b) |

*AWS reserves 5 IPs per subnet (first 4 and last 1)

### Availability Zones

- **us-east-1a**: Primary zone
- **us-east-1b**: Secondary zone (for high availability)

---

## Part 1: Create VPC

### Method A: AWS Console (UI)

#### Step 1.1: Navigate to VPC Dashboard

1. **Sign in** to AWS Console: https://console.aws.amazon.com
2. In the **search bar** at the top, type: `VPC`
3. Click on **VPC** under Services

![AWS Console Search](Screenshot would show: Search bar with "VPC" typed)

#### Step 1.2: Start VPC Creation

1. In the left sidebar, click **Your VPCs**
2. Click the orange **Create VPC** button (top right)

![VPC Dashboard](Screenshot would show: VPC dashboard with Create VPC button)

#### Step 1.3: Configure VPC Settings

Fill in the following:

**VPC Settings:**
- **Resources to create**: Select "VPC only" (we'll create subnets separately)
- **Name tag**: `FloodGuard-VPC`
- **IPv4 CIDR block**: Select "IPv4 CIDR manual input"
  - Enter: `10.0.0.0/16`
- **IPv6 CIDR block**: Select "No IPv6 CIDR block"
- **Tenancy**: Default

**Tags:**
- Click **Add new tag**
  - Key: `Project`
  - Value: `FloodGuard`

![VPC Configuration](Screenshot would show: VPC creation form filled out)

#### Step 1.4: Create VPC

1. Click **Create VPC** (bottom right)
2. Wait for the success message: ✅ "Successfully created vpc-xxxxxxxxx"
3. **Note down** your VPC ID (e.g., `vpc-07d2b4c43ff041146`)

#### Step 1.5: Enable DNS Hostnames

1. Select your newly created VPC (checkbox)
2. Click **Actions** dropdown
3. Select **Edit VPC settings**
4. Scroll down to **DNS settings**
5. ✅ Check **Enable DNS hostnames**
6. Click **Save** (bottom right)

![Enable DNS](Screenshot would show: Edit VPC settings with DNS hostnames enabled)

### Method B: AWS CLI

#### Step 1.1: Create VPC

```bash
# Create VPC
VPC_ID=$(aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=FloodGuard-VPC},{Key=Project,Value=FloodGuard}]' \
  --query 'Vpc.VpcId' \
  --output text)

echo "VPC Created: $VPC_ID"
```

**Expected Output:**
```
VPC Created: vpc-07d2b4c43ff041146
```

#### Step 1.2: Enable DNS Hostnames

```bash
# Enable DNS hostnames
aws ec2 modify-vpc-attribute \
  --vpc-id $VPC_ID \
  --enable-dns-hostnames

echo "DNS hostnames enabled for $VPC_ID"
```

#### Step 1.3: Verify VPC Creation

```bash
# Describe the VPC
aws ec2 describe-vpcs \
  --vpc-ids $VPC_ID \
  --query 'Vpcs[0].[VpcId,CidrBlock,State]' \
  --output table
```

**Expected Output:**
```
-------------------------------------------
|              DescribeVpcs               |
+------------------------+----------------+
|  vpc-07d2b4c43ff041146 |  10.0.0.0/16   |
|  available              |                |
+------------------------+----------------+
```

### ✅ Part 1 Checklist

- [ ] VPC created with CIDR 10.0.0.0/16
- [ ] VPC ID noted down
- [ ] DNS hostnames enabled
- [ ] Project tag added

---

## Part 2: Create Internet Gateway

### What is an Internet Gateway?

An **Internet Gateway (IGW)** is a horizontally scaled, redundant, and highly available VPC component that allows communication between your VPC and the internet.

### Method A: AWS Console (UI)

#### Step 2.1: Navigate to Internet Gateways

1. In the VPC Dashboard left sidebar
2. Click **Internet Gateways**
3. Click **Create internet gateway** (orange button)

#### Step 2.2: Create Internet Gateway

**Configuration:**
- **Name tag**: `FloodGuard-IGW`
- **Tags**: Add tag
  - Key: `Project`
  - Value: `FloodGuard`

Click **Create internet gateway**

![IGW Creation](Screenshot would show: Internet gateway creation form)

#### Step 2.3: Attach IGW to VPC

After creation, you'll see a banner: "The Internet Gateway was created. Attach it to a VPC to enable traffic"

1. Click **Actions** dropdown
2. Select **Attach to VPC**
3. **Available VPCs**: Select `FloodGuard-VPC` (vpc-07d2b4c43ff041146)
4. Click **Attach internet gateway**

![Attach IGW](Screenshot would show: Attach internet gateway dialog)

Success message: ✅ "Successfully attached igw-xxxxxxxxx to vpc-07d2b4c43ff041146"

### Method B: AWS CLI

#### Step 2.1: Create Internet Gateway

```bash
# Create Internet Gateway
IGW_ID=$(aws ec2 create-internet-gateway \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=FloodGuard-IGW},{Key=Project,Value=FloodGuard}]' \
  --query 'InternetGateway.InternetGatewayId' \
  --output text)

echo "Internet Gateway Created: $IGW_ID"
```

**Expected Output:**
```
Internet Gateway Created: igw-009fc1d1086522ed5
```

#### Step 2.2: Attach IGW to VPC

```bash
# Attach Internet Gateway to VPC
aws ec2 attach-internet-gateway \
  --vpc-id $VPC_ID \
  --internet-gateway-id $IGW_ID

echo "Internet Gateway attached to VPC"
```

#### Step 2.3: Verify IGW Attachment

```bash
# Verify attachment
aws ec2 describe-internet-gateways \
  --internet-gateway-ids $IGW_ID \
  --query 'InternetGateways[0].Attachments[0].[State,VpcId]' \
  --output table
```

**Expected Output:**
```
--------------------------------------
|   DescribeInternetGateways         |
+------------+-----------------------+
|  available |  vpc-07d2b4c43ff041146|
+------------+-----------------------+
```

### ✅ Part 2 Checklist

- [ ] Internet Gateway created
- [ ] IGW ID noted down
- [ ] IGW attached to VPC
- [ ] State shows "available"

---

## Part 3: Create Subnets

### Understanding Subnets

**Subnets** divide your VPC into smaller networks. We'll create:
- **2 Public Subnets**: For resources that need direct internet access (ALB, NAT Gateway)
- **2 Private Subnets**: For resources that shouldn't be directly accessible (Database)

### Method A: AWS Console (UI)

#### Step 3.1: Navigate to Subnets

1. In VPC Dashboard left sidebar
2. Click **Subnets**
3. Click **Create subnet** (orange button)

#### Step 3.2: Create Public Subnet 1a

**VPC Settings:**
- **VPC ID**: Select `FloodGuard-VPC` (vpc-07d2b4c43ff041146)

**Subnet 1 of 4 - Public Subnet 1a:**
- **Subnet name**: `FloodGuard-Public-Subnet-1a`
- **Availability Zone**: `us-east-1a`
- **IPv4 CIDR block**: `10.0.1.0/24`

**Tags:**
- Key: `Project`, Value: `FloodGuard`
- Key: `Type`, Value: `Public`

Click **Add new subnet** to add the next subnet

![Subnet Creation](Screenshot would show: Create subnet form)

#### Step 3.3: Create Public Subnet 1b

**Subnet 2 of 4 - Public Subnet 1b:**
- **Subnet name**: `FloodGuard-Public-Subnet-1b`
- **Availability Zone**: `us-east-1b`
- **IPv4 CIDR block**: `10.0.2.0/24`

**Tags:**
- Key: `Project`, Value: `FloodGuard`
- Key: `Type`, Value: `Public`

Click **Add new subnet**

#### Step 3.4: Create Private Subnet 1a

**Subnet 3 of 4 - Private Subnet 1a:**
- **Subnet name**: `FloodGuard-Private-Subnet-1a`
- **Availability Zone**: `us-east-1a`
- **IPv4 CIDR block**: `10.0.11.0/24`

**Tags:**
- Key: `Project`, Value: `FloodGuard`
- Key: `Type`, Value: `Private`

Click **Add new subnet**

#### Step 3.5: Create Private Subnet 1b

**Subnet 4 of 4 - Private Subnet 1b:**
- **Subnet name**: `FloodGuard-Private-Subnet-1b`
- **Availability Zone**: `us-east-1b`
- **IPv4 CIDR block**: `10.0.12.0/24`

**Tags:**
- Key: `Project`, Value: `FloodGuard`
- Key: `Type`, Value: `Private`

#### Step 3.6: Review and Create

1. Review all 4 subnets
2. Click **Create subnet** (bottom right)
3. Wait for success message: ✅ "Successfully created 4 subnets"
4. **Note down** all subnet IDs

#### Step 3.7: Enable Auto-assign Public IP (Public Subnets Only)

For **Public Subnet 1a**:
1. Select the subnet (checkbox)
2. Click **Actions** → **Edit subnet settings**
3. ✅ Check **Enable auto-assign public IPv4 address**
4. Click **Save**

Repeat for **Public Subnet 1b**

![Auto-assign IP](Screenshot would show: Edit subnet settings)

### Method B: AWS CLI

#### Step 3.1: Create Public Subnet 1a

```bash
# Create Public Subnet 1a
PUBLIC_SUBNET_1=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.1.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=FloodGuard-Public-Subnet-1a},{Key=Project,Value=FloodGuard},{Key=Type,Value=Public}]' \
  --query 'Subnet.SubnetId' \
  --output text)

echo "Public Subnet 1a Created: $PUBLIC_SUBNET_1"
```

#### Step 3.2: Create Public Subnet 1b

```bash
# Create Public Subnet 1b
PUBLIC_SUBNET_2=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.2.0/24 \
  --availability-zone us-east-1b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=FloodGuard-Public-Subnet-1b},{Key=Project,Value=FloodGuard},{Key=Type,Value=Public}]' \
  --query 'Subnet.SubnetId' \
  --output text)

echo "Public Subnet 1b Created: $PUBLIC_SUBNET_2"
```

#### Step 3.3: Create Private Subnet 1a

```bash
# Create Private Subnet 1a
PRIVATE_SUBNET_1=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.11.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=FloodGuard-Private-Subnet-1a},{Key=Project,Value=FloodGuard},{Key=Type,Value=Private}]' \
  --query 'Subnet.SubnetId' \
  --output text)

echo "Private Subnet 1a Created: $PRIVATE_SUBNET_1"
```

#### Step 3.4: Create Private Subnet 1b

```bash
# Create Private Subnet 1b
PRIVATE_SUBNET_2=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.12.0/24 \
  --availability-zone us-east-1b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=FloodGuard-Private-Subnet-1b},{Key=Project,Value=FloodGuard},{Key=Type,Value=Private}]' \
  --query 'Subnet.SubnetId' \
  --output text)

echo "Private Subnet 1b Created: $PRIVATE_SUBNET_2"
```

#### Step 3.5: Enable Auto-assign Public IP

```bash
# Enable auto-assign public IP for public subnets
aws ec2 modify-subnet-attribute \
  --subnet-id $PUBLIC_SUBNET_1 \
  --map-public-ip-on-launch

aws ec2 modify-subnet-attribute \
  --subnet-id $PUBLIC_SUBNET_2 \
  --map-public-ip-on-launch

echo "Auto-assign public IP enabled for public subnets"
```

#### Step 3.6: Verify Subnet Creation

```bash
# List all subnets in the VPC
aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query 'Subnets[].[SubnetId,CidrBlock,AvailabilityZone,Tags[?Key==`Name`].Value|[0]]' \
  --output table
```

**Expected Output:**
```
---------------------------------------------------------------------------------------
|                                   DescribeSubnets                                   |
+---------------------------+---------------+-------------+----------------------------+
|  subnet-0704ba19e17cd3ddd |  10.0.1.0/24  |  us-east-1a |  FloodGuard-Public-Subnet-1a  |
|  subnet-0dc2ca207cee180e9 |  10.0.2.0/24  |  us-east-1b |  FloodGuard-Public-Subnet-1b  |
|  subnet-00229db6e6d13c216 |  10.0.11.0/24 |  us-east-1a |  FloodGuard-Private-Subnet-1a |
|  subnet-0adbb4338e964368d |  10.0.12.0/24 |  us-east-1b |  FloodGuard-Private-Subnet-1b |
+---------------------------+---------------+-------------+----------------------------+
```

### ✅ Part 3 Checklist

- [ ] 4 subnets created (2 public, 2 private)
- [ ] All subnet IDs noted down
- [ ] Public subnets span AZs (1a, 1b)
- [ ] Private subnets span AZs (1a, 1b)
- [ ] Auto-assign public IP enabled for public subnets

---

## Part 4: Create Route Tables

### Understanding Route Tables

**Route Tables** contain rules (routes) that determine where network traffic is directed. We need:
- **Public Route Table**: Routes traffic to Internet Gateway (for internet access)
- **Private Route Table**: Routes traffic to NAT Gateway (for outbound-only internet)

### Method A: AWS Console (UI)

#### Step 4.1: Create Public Route Table

1. In VPC Dashboard left sidebar
2. Click **Route Tables**
3. Click **Create route table** (orange button)

**Configuration:**
- **Name**: `FloodGuard-Public-RT`
- **VPC**: Select `FloodGuard-VPC` (vpc-07d2b4c43ff041146)

**Tags:**
- Key: `Project`, Value: `FloodGuard`
- Key: `Type`, Value: `Public`

Click **Create route table**

![Route Table Creation](Screenshot would show: Create route table form)

#### Step 4.2: Add Route to Internet Gateway

1. Select the **FloodGuard-Public-RT** (checkbox)
2. Click **Routes** tab (bottom panel)
3. Click **Edit routes**
4. Click **Add route**
   - **Destination**: `0.0.0.0/0`
   - **Target**: Select "Internet Gateway", then select `FloodGuard-IGW`
5. Click **Save changes**

![Add Route](Screenshot would show: Edit routes dialog with IGW selected)

#### Step 4.3: Associate Public Subnets

1. With **FloodGuard-Public-RT** still selected
2. Click **Subnet associations** tab
3. Click **Edit subnet associations**
4. ✅ Check both public subnets:
   - `FloodGuard-Public-Subnet-1a`
   - `FloodGuard-Public-Subnet-1b`
5. Click **Save associations**

![Associate Subnets](Screenshot would show: Subnet associations dialog)

### Method B: AWS CLI

#### Step 4.1: Create Public Route Table

```bash
# Create Public Route Table
PUBLIC_RT=$(aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=FloodGuard-Public-RT},{Key=Project,Value=FloodGuard},{Key=Type,Value=Public}]' \
  --query 'RouteTable.RouteTableId' \
  --output text)

echo "Public Route Table Created: $PUBLIC_RT"
```

#### Step 4.2: Add Route to Internet Gateway

```bash
# Add route to Internet Gateway
aws ec2 create-route \
  --route-table-id $PUBLIC_RT \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id $IGW_ID

echo "Route to Internet Gateway added"
```

#### Step 4.3: Associate Public Subnets

```bash
# Associate public subnet 1a
aws ec2 associate-route-table \
  --route-table-id $PUBLIC_RT \
  --subnet-id $PUBLIC_SUBNET_1

# Associate public subnet 1b
aws ec2 associate-route-table \
  --route-table-id $PUBLIC_RT \
  --subnet-id $PUBLIC_SUBNET_2

echo "Public subnets associated with public route table"
```

#### Step 4.4: Verify Route Table

```bash
# Describe the public route table
aws ec2 describe-route-tables \
  --route-table-ids $PUBLIC_RT \
  --query 'RouteTables[0].Routes[].[DestinationCidrBlock,GatewayId,State]' \
  --output table
```

**Expected Output:**
```
-------------------------------------------------
|           DescribeRouteTables                 |
+---------------+------------------------+-------+
|  10.0.0.0/16  |  local                 | active|
|  0.0.0.0/0    |  igw-009fc1d1086522ed5 | active|
+---------------+------------------------+-------+
```

### ✅ Part 4 Checklist (Public Route Table)

- [ ] Public route table created
- [ ] Route table ID noted down
- [ ] Route to IGW added (0.0.0.0/0 → IGW)
- [ ] Both public subnets associated

---

## Part 5: Create NAT Gateway

### What is a NAT Gateway?

A **NAT Gateway** allows instances in private subnets to connect to the internet (for updates, API calls) but prevents the internet from initiating connections to those instances.

### Why Do We Need It?

- ✅ Database instances need to download security patches
- ✅ Application servers need to call external APIs
- ✅ But we don't want them directly accessible from the internet

### Method A: AWS Console (UI)

#### Step 5.1: Allocate Elastic IP

1. In VPC Dashboard left sidebar
2. Click **Elastic IPs**
3. Click **Allocate Elastic IP address** (orange button)

**Configuration:**
- **Network Border Group**: `us-east-1`
- **Public IPv4 address pool**: Amazon's pool of IPv4 addresses

**Tags:**
- Key: `Name`, Value: `FloodGuard-NAT-EIP`
- Key: `Project`, Value: `FloodGuard`

Click **Allocate**

**Note down** the Allocation ID (e.g., `eipalloc-0cdc1e689e7f481e1`)

![Allocate EIP](Screenshot would show: Allocate Elastic IP form)

#### Step 5.2: Create NAT Gateway

1. In VPC Dashboard left sidebar
2. Click **NAT Gateways**
3. Click **Create NAT gateway** (orange button)

**Configuration:**
- **Name**: `FloodGuard-NAT-GW`
- **Subnet**: Select `FloodGuard-Public-Subnet-1a` (must be public!)
- **Connectivity type**: Public
- **Elastic IP allocation ID**: Select the EIP you just created

**Tags:**
- Key: `Project`, Value: `FloodGuard`

Click **Create NAT gateway**

![Create NAT Gateway](Screenshot would show: Create NAT gateway form)

#### Step 5.3: Wait for NAT Gateway

⏳ **This takes 1-2 minutes!**

Wait until the **State** changes from "Pending" to "Available"

![NAT Gateway Status](Screenshot would show: NAT gateway in available state)

#### Step 5.4: Create Private Route Table

1. Click **Route Tables** in left sidebar
2. Click **Create route table**

**Configuration:**
- **Name**: `FloodGuard-Private-RT`
- **VPC**: Select `FloodGuard-VPC`

**Tags:**
- Key: `Project`, Value: `FloodGuard`
- Key: `Type`, Value: `Private`

Click **Create route table**

#### Step 5.5: Add Route to NAT Gateway

1. Select **FloodGuard-Private-RT** (checkbox)
2. Click **Routes** tab
3. Click **Edit routes**
4. Click **Add route**
   - **Destination**: `0.0.0.0/0`
   - **Target**: Select "NAT Gateway", then select `FloodGuard-NAT-GW`
5. Click **Save changes**

![Route to NAT](Screenshot would show: Edit routes with NAT Gateway)

#### Step 5.6: Associate Private Subnets

1. With **FloodGuard-Private-RT** still selected
2. Click **Subnet associations** tab
3. Click **Edit subnet associations**
4. ✅ Check both private subnets:
   - `FloodGuard-Private-Subnet-1a`
   - `FloodGuard-Private-Subnet-1b`
5. Click **Save associations**

### Method B: AWS CLI

#### Step 5.1: Allocate Elastic IP

```bash
# Allocate Elastic IP for NAT Gateway
EIP_ALLOC=$(aws ec2 allocate-address \
  --domain vpc \
  --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=FloodGuard-NAT-EIP},{Key=Project,Value=FloodGuard}]' \
  --query 'AllocationId' \
  --output text)

echo "Elastic IP Allocated: $EIP_ALLOC"

# Get the public IP address
EIP_ADDRESS=$(aws ec2 describe-addresses \
  --allocation-ids $EIP_ALLOC \
  --query 'Addresses[0].PublicIp' \
  --output text)

echo "Elastic IP Address: $EIP_ADDRESS"
```

#### Step 5.2: Create NAT Gateway

```bash
# Create NAT Gateway (in public subnet!)
NAT_GW=$(aws ec2 create-nat-gateway \
  --subnet-id $PUBLIC_SUBNET_1 \
  --allocation-id $EIP_ALLOC \
  --tag-specifications 'ResourceType=natgateway,Tags=[{Key=Name,Value=FloodGuard-NAT-GW},{Key=Project,Value=FloodGuard}]' \
  --query 'NatGateway.NatGatewayId' \
  --output text)

echo "NAT Gateway Created: $NAT_GW"
```

#### Step 5.3: Wait for NAT Gateway to Become Available

```bash
# Wait for NAT Gateway (this takes 1-2 minutes)
echo "⏳ Waiting for NAT Gateway to become available..."
aws ec2 wait nat-gateway-available --nat-gateway-ids $NAT_GW
echo "✅ NAT Gateway is now available"
```

#### Step 5.4: Create Private Route Table

```bash
# Create Private Route Table
PRIVATE_RT=$(aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=FloodGuard-Private-RT},{Key=Project,Value=FloodGuard},{Key=Type,Value=Private}]' \
  --query 'RouteTable.RouteTableId' \
  --output text)

echo "Private Route Table Created: $PRIVATE_RT"
```

#### Step 5.5: Add Route to NAT Gateway

```bash
# Add route to NAT Gateway
aws ec2 create-route \
  --route-table-id $PRIVATE_RT \
  --destination-cidr-block 0.0.0.0/0 \
  --nat-gateway-id $NAT_GW

echo "Route to NAT Gateway added"
```

#### Step 5.6: Associate Private Subnets

```bash
# Associate private subnet 1a
aws ec2 associate-route-table \
  --route-table-id $PRIVATE_RT \
  --subnet-id $PRIVATE_SUBNET_1

# Associate private subnet 1b
aws ec2 associate-route-table \
  --route-table-id $PRIVATE_RT \
  --subnet-id $PRIVATE_SUBNET_2

echo "Private subnets associated with private route table"
```

#### Step 5.7: Verify NAT Gateway Setup

```bash
# Check NAT Gateway status
aws ec2 describe-nat-gateways \
  --nat-gateway-ids $NAT_GW \
  --query 'NatGateways[0].[NatGatewayId,State,SubnetId]' \
  --output table

# Check private route table
aws ec2 describe-route-tables \
  --route-table-ids $PRIVATE_RT \
  --query 'RouteTables[0].Routes[].[DestinationCidrBlock,NatGatewayId,State]' \
  --output table
```

### ✅ Part 5 Checklist

- [ ] Elastic IP allocated
- [ ] NAT Gateway created in public subnet
- [ ] NAT Gateway state is "available"
- [ ] Private route table created
- [ ] Route to NAT Gateway added
- [ ] Both private subnets associated

---

## Part 6: Create Security Groups

### What are Security Groups?

**Security Groups** act as virtual firewalls for your instances. They control inbound and outbound traffic based on rules you define.

We'll create 3 security groups:
1. **Web Security Group**: For load balancers and web servers
2. **App Security Group**: For application servers
3. **Database Security Group**: For RDS database

### Method A: AWS Console (UI)

#### Step 6.1: Create Web Security Group

1. In VPC Dashboard left sidebar
2. Click **Security Groups**
3. Click **Create security group** (orange button)

**Basic details:**
- **Security group name**: `FloodGuard-Web-SG`
- **Description**: `Security group for web servers and ALB`
- **VPC**: Select `FloodGuard-VPC`

**Inbound rules:**

Click **Add rule** for each:

| Rule | Type | Protocol | Port Range | Source | Description |
|------|------|----------|------------|--------|-------------|
| 1 | HTTP | TCP | 80 | 0.0.0.0/0 | HTTP from internet |
| 2 | HTTPS | TCP | 443 | 0.0.0.0/0 | HTTPS from internet |
| 3 | Custom TCP | TCP | 3000 | 0.0.0.0/0 | Next.js frontend |
| 4 | Custom TCP | TCP | 3001 | 0.0.0.0/0 | NestJS backend API |

**Outbound rules:**
- Leave default (All traffic to 0.0.0.0/0)

**Tags:**
- Key: `Project`, Value: `FloodGuard`

Click **Create security group**

![Web Security Group](Screenshot would show: Create security group form)

#### Step 6.2: Create App Security Group

Click **Create security group** again

**Basic details:**
- **Security group name**: `FloodGuard-App-SG`
- **Description**: `Security group for application servers`
- **VPC**: Select `FloodGuard-VPC`

**Inbound rules:**

| Rule | Type | Protocol | Port Range | Source | Description |
|------|------|----------|------------|--------|-------------|
| 1 | Custom TCP | TCP | 3001 | Custom → Select `FloodGuard-Web-SG` | API from Web SG |
| 2 | SSH | TCP | 22 | 0.0.0.0/0 | SSH for debugging |

**Outbound rules:**
- Leave default

**Tags:**
- Key: `Project`, Value: `FloodGuard`

Click **Create security group**

![App Security Group](Screenshot would show: App SG with source from Web SG)

#### Step 6.3: Create Database Security Group

Click **Create security group** again

**Basic details:**
- **Security group name**: `FloodGuard-DB-SG`
- **Description**: `Security group for RDS database`
- **VPC**: Select `FloodGuard-VPC`

**Inbound rules:**

| Rule | Type | Protocol | Port Range | Source | Description |
|------|------|----------|------------|--------|-------------|
| 1 | PostgreSQL | TCP | 5432 | Custom → Select `FloodGuard-App-SG` | PostgreSQL from App |
| 2 | PostgreSQL | TCP | 5432 | Custom → Select `FloodGuard-Web-SG` | PostgreSQL from Web |

**Outbound rules:**
- Leave default

**Tags:**
- Key: `Project`, Value: `FloodGuard`

Click **Create security group**

![Database Security Group](Screenshot would show: DB SG with PostgreSQL rules)

### Method B: AWS CLI

#### Step 6.1: Create Web Security Group

```bash
# Create Web Security Group
WEB_SG=$(aws ec2 create-security-group \
  --group-name "FloodGuard-Web-SG" \
  --description "Security group for web servers and ALB" \
  --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=security-group,Tags=[{Key=Name,Value=FloodGuard-Web-SG},{Key=Project,Value=FloodGuard}]' \
  --query 'GroupId' \
  --output text)

echo "Web Security Group Created: $WEB_SG"

# Add inbound rules to Web SG
aws ec2 authorize-security-group-ingress \
  --group-id $WEB_SG \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $WEB_SG \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $WEB_SG \
  --protocol tcp \
  --port 3000 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $WEB_SG \
  --protocol tcp \
  --port 3001 \
  --cidr 0.0.0.0/0

echo "Web SG rules added (HTTP, HTTPS, 3000, 3001)"
```

#### Step 6.2: Create App Security Group

```bash
# Create App Security Group
APP_SG=$(aws ec2 create-security-group \
  --group-name "FloodGuard-App-SG" \
  --description "Security group for application servers" \
  --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=security-group,Tags=[{Key=Name,Value=FloodGuard-App-SG},{Key=Project,Value=FloodGuard}]' \
  --query 'GroupId' \
  --output text)

echo "App Security Group Created: $APP_SG"

# Add inbound rules to App SG
aws ec2 authorize-security-group-ingress \
  --group-id $APP_SG \
  --protocol tcp \
  --port 3001 \
  --source-group $WEB_SG

aws ec2 authorize-security-group-ingress \
  --group-id $APP_SG \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0

echo "App SG rules added"
```

#### Step 6.3: Create Database Security Group

```bash
# Create Database Security Group
DB_SG=$(aws ec2 create-security-group \
  --group-name "FloodGuard-DB-SG" \
  --description "Security group for RDS database" \
  --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=security-group,Tags=[{Key=Name,Value=FloodGuard-DB-SG},{Key=Project,Value=FloodGuard}]' \
  --query 'GroupId' \
  --output text)

echo "Database Security Group Created: $DB_SG"

# Add inbound rules to DB SG
aws ec2 authorize-security-group-ingress \
  --group-id $DB_SG \
  --protocol tcp \
  --port 5432 \
  --source-group $APP_SG

aws ec2 authorize-security-group-ingress \
  --group-id $DB_SG \
  --protocol tcp \
  --port 5432 \
  --source-group $WEB_SG

echo "DB SG rules added"
```

#### Step 6.4: Verify Security Groups

```bash
# List all security groups
aws ec2 describe-security-groups \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query 'SecurityGroups[].[GroupId,GroupName,Description]' \
  --output table
```

**Expected Output:**
```
----------------------------------------------------------------------------------
|                           DescribeSecurityGroups                               |
+--------------------------+----------------------+------------------------------+
|  sg-0d7db9709c3129f59    |  FloodGuard-Web-SG   | Security group for web...    |
|  sg-04e61c0f13297e3a1    |  FloodGuard-App-SG   | Security group for app...    |
|  sg-01633b6bfc23f1cfc    |  FloodGuard-DB-SG    | Security group for RDS...    |
+--------------------------+----------------------+------------------------------+
```

### ✅ Part 6 Checklist

- [ ] Web Security Group created with HTTP/HTTPS rules
- [ ] App Security Group created
- [ ] Database Security Group created
- [ ] All security group IDs noted down

---

## Verification Steps

### Verify Complete Infrastructure

#### Method A: AWS Console

1. **VPC Dashboard** → Overview
2. You should see:
   - ✅ 1 VPC
   - ✅ 4 Subnets
   - ✅ 2 Route Tables (+ 1 default)
   - ✅ 1 Internet Gateway
   - ✅ 1 NAT Gateway
   - ✅ 3 Security Groups (+ 1 default)

#### Method B: AWS CLI

```bash
# Complete verification script
echo "=== VPC Infrastructure Verification ==="
echo ""

echo "1. VPC:"
aws ec2 describe-vpcs \
  --vpc-ids $VPC_ID \
  --query 'Vpcs[0].[VpcId,CidrBlock,State]' \
  --output table

echo ""
echo "2. Internet Gateway:"
aws ec2 describe-internet-gateways \
  --internet-gateway-ids $IGW_ID \
  --query 'InternetGateways[0].[InternetGatewayId,Attachments[0].State]' \
  --output table

echo ""
echo "3. Subnets:"
aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query 'Subnets[].[SubnetId,CidrBlock,AvailabilityZone,MapPublicIpOnLaunch]' \
  --output table

echo ""
echo "4. NAT Gateway:"
aws ec2 describe-nat-gateways \
  --nat-gateway-ids $NAT_GW \
  --query 'NatGateways[0].[NatGatewayId,State]' \
  --output table

echo ""
echo "5. Route Tables:"
aws ec2 describe-route-tables \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query 'RouteTables[].[RouteTableId,Tags[?Key==`Name`].Value|[0],Associations[0].SubnetId]' \
  --output table

echo ""
echo "6. Security Groups:"
aws ec2 describe-security-groups \
  --filters "Name=vpc-id,Values=$VPC_ID" "Name=group-name,Values=FloodGuard*" \
  --query 'SecurityGroups[].[GroupId,GroupName]' \
  --output table

echo ""
echo "✅ Verification Complete!"
```

### Save Configuration

#### Method: CLI

```bash
# Save all IDs to a file
cat > floodguard-vpc-config.sh << EOF
#!/bin/bash
# FloodGuard VPC Configuration
# Generated: $(date)

export VPC_ID="$VPC_ID"
export IGW_ID="$IGW_ID"
export NAT_GW="$NAT_GW"
export EIP_ALLOC="$EIP_ALLOC"

export PUBLIC_SUBNET_1="$PUBLIC_SUBNET_1"
export PUBLIC_SUBNET_2="$PUBLIC_SUBNET_2"
export PRIVATE_SUBNET_1="$PRIVATE_SUBNET_1"
export PRIVATE_SUBNET_2="$PRIVATE_SUBNET_2"

export PUBLIC_RT="$PUBLIC_RT"
export PRIVATE_RT="$PRIVATE_RT"

export WEB_SG="$WEB_SG"
export APP_SG="$APP_SG"
export DB_SG="$DB_SG"

echo "FloodGuard VPC Configuration Loaded"
echo "VPC ID: \$VPC_ID"
EOF

chmod +x floodguard-vpc-config.sh

# Also save as JSON
cat > floodguard-vpc-config.json << EOF
{
  "VpcId": "$VPC_ID",
  "InternetGatewayId": "$IGW_ID",
  "NatGatewayId": "$NAT_GW",
  "ElasticIpAllocationId": "$EIP_ALLOC",
  "PublicSubnets": {
    "Subnet1a": "$PUBLIC_SUBNET_1",
    "Subnet1b": "$PUBLIC_SUBNET_2"
  },
  "PrivateSubnets": {
    "Subnet1a": "$PRIVATE_SUBNET_1",
    "Subnet1b": "$PRIVATE_SUBNET_2"
  },
  "RouteTables": {
    "Public": "$PUBLIC_RT",
    "Private": "$PRIVATE_RT"
  },
  "SecurityGroups": {
    "Web": "$WEB_SG",
    "App": "$APP_SG",
    "Database": "$DB_SG"
  }
}
EOF

echo "Configuration saved to:"
echo "  - floodguard-vpc-config.sh"
echo "  - floodguard-vpc-config.json"
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: "Insufficient permissions"

**Error:**
```
An error occurred (UnauthorizedOperation) when calling the CreateVpc operation
```

**Solution:**
- Check your IAM user has EC2 full access
- Verify AWS credentials are configured correctly
```bash
aws sts get-caller-identity
```

#### Issue 2: NAT Gateway stuck in "Pending"

**Symptoms:**
- NAT Gateway state shows "pending" for more than 5 minutes

**Solution:**
1. Check if the subnet is public (has IGW route)
2. Verify Elastic IP is allocated
3. Wait up to 10 minutes (it can take time)
4. If still pending after 10 minutes, delete and recreate

```bash
# Check NAT Gateway status
aws ec2 describe-nat-gateways --nat-gateway-ids $NAT_GW
```

#### Issue 3: "Invalid CIDR block overlap"

**Error:**
```
InvalidSubnet.Conflict: The CIDR '10.0.1.0/24' conflicts with another subnet
```

**Solution:**
- Check existing subnets in the VPC
- Ensure CIDR blocks don't overlap
- Use different CIDR ranges

```bash
# List all subnets
aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID"
```

#### Issue 4: Can't delete VPC

**Error:**
```
DependencyViolation: The vpc has dependencies and cannot be deleted
```

**Solution:**
- Delete resources in this order:
  1. EC2 instances
  2. NAT Gateways (and release Elastic IPs)
  3. Load Balancers
  4. RDS instances
  5. Network interfaces
  6. Internet Gateways (detach first)
  7. Subnets
  8. Route tables
  9. Security groups
  10. VPC

#### Issue 5: Security group rules not working

**Symptoms:**
- Can't connect to instances
- Database connections timing out

**Troubleshooting steps:**
1. Check security group inbound rules
2. Verify source is correct (0.0.0.0/0 or specific SG)
3. Check Network ACLs (should allow all by default)
4. Verify route tables
5. Check if instance is in the right subnet

```bash
# Check security group rules
aws ec2 describe-security-groups --group-ids $WEB_SG
```

### Verification Commands

```bash
# Test internet connectivity from public subnet
# (Launch a test EC2 instance first)
ping -c 4 8.8.8.8

# Test NAT Gateway from private subnet
# (Launch a test EC2 instance in private subnet)
curl -I https://www.google.com
```

---

## Cost Optimization

### Monthly Cost Breakdown

| Resource | Cost | Can Optimize? |
|----------|------|---------------|
| VPC | Free | - |
| Subnets | Free | - |
| Internet Gateway | Free | - |
| **NAT Gateway** | $32.40/month | ✅ Yes |
| **NAT Data Processing** | $0.045/GB | ✅ Yes |
| Elastic IP (attached) | Free | - |
| Elastic IP (unattached) | $3.60/month | ✅ Release unused |
| Route Tables | Free | - |
| Security Groups | Free | - |

**Total Estimated Cost:** $35-60/month

### Cost Optimization Strategies

#### 1. Use Single NAT Gateway

**Current Setup:** 1 NAT Gateway
**Alternative:** NAT Gateway per AZ (more resilient but doubles cost)

✅ **Recommendation:** Keep single NAT Gateway for development/staging

#### 2. Use NAT Instance Instead

**Cost Savings:** ~$25/month (t3.nano is ~$3.80/month)

**Trade-offs:**
- ❌ More management overhead
- ❌ Lower performance
- ❌ Not highly available
- ✅ Much cheaper

**When to use:**
- Development environments
- Low-traffic applications
- Cost-sensitive projects

#### 3. Use VPC Endpoints

For AWS services (S3, DynamoDB, etc.), use VPC Endpoints instead of NAT Gateway:

```bash
# Example: S3 VPC Endpoint
aws ec2 create-vpc-endpoint \
  --vpc-id $VPC_ID \
  --service-name com.amazonaws.us-east-1.s3 \
  --route-table-ids $PRIVATE_RT
```

**Savings:** Reduces NAT Gateway data transfer costs

#### 4. Monitor and Alert

Set up CloudWatch billing alerts:

```bash
# Create SNS topic for alerts
aws sns create-topic --name FloodGuard-Billing-Alerts

# Subscribe to email
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:YOUR_ACCOUNT:FloodGuard-Billing-Alerts \
  --protocol email \
  --notification-endpoint your-email@example.com
```

---

## Security Best Practices

### Immediate Actions (Before Production)

#### 1. Restrict SSH Access

**Current:** SSH open to 0.0.0.0/0  
**Fix:**

```bash
# Remove open SSH rule
aws ec2 revoke-security-group-ingress \
  --group-id $APP_SG \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0

# Add restricted SSH rule (replace with your IP)
aws ec2 authorize-security-group-ingress \
  --group-id $APP_SG \
  --protocol tcp \
  --port 22 \
  --cidr YOUR_IP_ADDRESS/32
```

#### 2. Enable VPC Flow Logs

Monitor network traffic:

```bash
# Create CloudWatch Log Group
aws logs create-log-group \
  --log-group-name /aws/vpc/floodguard

# Create IAM role for Flow Logs (requires IAM permissions)
# Then enable Flow Logs
aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids $VPC_ID \
  --traffic-type ALL \
  --log-destination-type cloud-watch-logs \
  --log-group-name /aws/vpc/floodguard
```

#### 3. Use AWS Systems Manager Instead of SSH

**Benefits:**
- ✅ No need for SSH keys
- ✅ No need for port 22 open
- ✅ Session logging
- ✅ No bastion host needed

#### 4. Implement Network ACLs

For additional layer of security (stateless firewall):

```bash
# Example: Block suspicious IP
aws ec2 create-network-acl-entry \
  --network-acl-id $NACL_ID \
  --ingress \
  --rule-number 100 \
  --protocol -1 \
  --cidr-block SUSPICIOUS_IP/32 \
  --rule-action deny
```

### Security Checklist

- [ ] SSH restricted to specific IPs only
- [ ] VPC Flow Logs enabled
- [ ] CloudWatch monitoring enabled
- [ ] Database in private subnets
- [ ] Security group rules follow least privilege
- [ ] No unnecessary ports open
- [ ] Regular security group audits scheduled
- [ ] AWS Config rules enabled
- [ ] GuardDuty enabled (threat detection)
- [ ] Secrets Manager for database credentials

---

## Cleanup Instructions

### ⚠️ WARNING: This will DELETE all resources!

**Before cleanup:**
1. Backup any data
2. Export configurations
3. Take snapshots of databases
4. Save application code

### Method A: AWS Console

**Delete in this exact order:**

1. **NAT Gateway**
   - VPC Dashboard → NAT Gateways
   - Select → Actions → Delete NAT gateway
   - Wait for deletion (takes 2-3 minutes)

2. **Release Elastic IP**
   - VPC Dashboard → Elastic IPs
   - Select → Actions → Release Elastic IP addresses

3. **Delete Route Tables**
   - VPC Dashboard → Route Tables
   - Delete custom route tables (not main!)

4. **Delete Subnets**
   - VPC Dashboard → Subnets
   - Select all 4 → Actions → Delete subnet

5. **Detach and Delete Internet Gateway**
   - VPC Dashboard → Internet Gateways
   - Select → Actions → Detach from VPC
   - Then: Actions → Delete internet gateway

6. **Delete Security Groups**
   - VPC Dashboard → Security Groups
   - Delete custom security groups (not default!)

7. **Delete VPC**
   - VPC Dashboard → Your VPCs
   - Select → Actions → Delete VPC

### Method B: AWS CLI

```bash
#!/bin/bash
# Cleanup script - DESTRUCTIVE!

echo "⚠️  This will DELETE all FloodGuard VPC resources!"
echo "Press Ctrl+C to cancel, or wait 10 seconds to proceed..."
sleep 10

# Source the config
source floodguard-vpc-config.sh

echo "1. Deleting NAT Gateway..."
aws ec2 delete-nat-gateway --nat-gateway-id $NAT_GW
echo "⏳ Waiting for NAT Gateway deletion..."
aws ec2 wait nat-gateway-deleted --nat-gateway-ids $NAT_GW || true

echo "2. Releasing Elastic IP..."
aws ec2 release-address --allocation-id $EIP_ALLOC

echo "3. Deleting Route Tables..."
aws ec2 delete-route-table --route-table-id $PUBLIC_RT
aws ec2 delete-route-table --route-table-id $PRIVATE_RT

echo "4. Deleting Subnets..."
aws ec2 delete-subnet --subnet-id $PUBLIC_SUBNET_1
aws ec2 delete-subnet --subnet-id $PUBLIC_SUBNET_2
aws ec2 delete-subnet --subnet-id $PRIVATE_SUBNET_1
aws ec2 delete-subnet --subnet-id $PRIVATE_SUBNET_2

echo "5. Detaching and Deleting Internet Gateway..."
aws ec2 detach-internet-gateway --internet-gateway-id $IGW_ID --vpc-id $VPC_ID
aws ec2 delete-internet-gateway --internet-gateway-id $IGW_ID

echo "6. Deleting Security Groups..."
aws ec2 delete-security-group --group-id $WEB_SG
aws ec2 delete-security-group --group-id $APP_SG
aws ec2 delete-security-group --group-id $DB_SG

echo "7. Deleting VPC..."
aws ec2 delete-vpc --vpc-id $VPC_ID

echo "✅ Cleanup complete!"
```

### Verify Deletion

```bash
# Should return no results
aws ec2 describe-vpcs --vpc-ids $VPC_ID
```

**Expected:**
```
An error occurred (InvalidVpcID.NotFound)
```

---

## Next Steps

### 1. Create RDS Database

**Tutorial:** [AWS RDS PostgreSQL Setup Guide](./AWS-RDS-SETUP-GUIDE.md)

**Quick Start:**
```bash
# Create DB Subnet Group
aws rds create-db-subnet-group \
  --db-subnet-group-name floodguard-db-subnet-group \
  --db-subnet-group-description "FloodGuard Database Subnet Group" \
  --subnet-ids $PRIVATE_SUBNET_1 $PRIVATE_SUBNET_2

# Create RDS Instance
aws rds create-db-instance \
  --db-instance-identifier floodguard-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username postgres \
  --master-user-password YourSecurePassword123! \
  --allocated-storage 20 \
  --vpc-security-group-ids $DB_SG \
  --db-subnet-group-name floodguard-db-subnet-group \
  --multi-az
```

### 2. Deploy Elastic Beanstalk

**Frontend:**
```bash
cd frontend
eb init -p node.js FloodGuard-Frontend --region us-east-1
eb create floodguard-frontend-prod \
  --vpc.id $VPC_ID \
  --vpc.elbsubnets $PUBLIC_SUBNET_1,$PUBLIC_SUBNET_2 \
  --vpc.ec2subnets $PRIVATE_SUBNET_1,$PRIVATE_SUBNET_2 \
  --vpc.securitygroups $WEB_SG
```

**Backend:**
```bash
cd backend
eb init -p node.js FloodGuard-Backend --region us-east-1
eb create floodguard-backend-prod \
  --vpc.id $VPC_ID \
  --vpc.elbsubnets $PUBLIC_SUBNET_1,$PUBLIC_SUBNET_2 \
  --vpc.ec2subnets $PRIVATE_SUBNET_1,$PRIVATE_SUBNET_2 \
  --vpc.securitygroups $APP_SG
```

### 3. Set Up Additional Services

- **S3**: File storage for flood reports
- **SNS**: SMS notifications
- **SES**: Email alerts
- **CloudWatch**: Monitoring and logging
- **Lambda**: Serverless functions
- **CloudFront**: CDN for static assets

### 4. Configure Domain and SSL

1. Register domain in Route 53
2. Request SSL certificate from ACM
3. Configure ALB with HTTPS listener
4. Create Route 53 records pointing to ALB

---

## Additional Resources

### AWS Documentation

- [VPC User Guide](https://docs.aws.amazon.com/vpc/)
- [VPC Best Practices](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-best-practices.html)
- [NAT Gateway](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html)
- [Security Groups](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_SecurityGroups.html)

### Helpful Tools

- **VPC CIDR Calculator**: https://www.ipaddressguide.com/cidr
- **AWS Cost Calculator**: https://calculator.aws/
- **VPC Diagram Tool**: https://cloudcraft.co/

### Support

- AWS Support Center: https://console.aws.amazon.com/support
- AWS Forums: https://forums.aws.amazon.com/
- FloodGuard GitHub Issues: (your-repo-url)

---

## Conclusion

🎉 **Congratulations!** You've successfully created a production-ready VPC infrastructure for the FloodGuard application.

### What You've Accomplished

✅ Created an isolated VPC network  
✅ Set up public and private subnets across 2 AZs  
✅ Configured internet access via Internet Gateway  
✅ Enabled outbound internet for private subnets via NAT Gateway  
✅ Implemented security with Security Groups  
✅ Prepared infrastructure for high availability  

### Your VPC is Now Ready For:

- RDS PostgreSQL Database deployment
- Elastic Beanstalk application environments
- Load Balancer configuration
- Auto Scaling groups
- Additional AWS services

---

**Document Version:** 1.0  
**Last Updated:** June 28, 2026  
**Maintained By:** FloodGuard DevOps Team  
**License:** Internal Use Only

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────┐
│         FloodGuard VPC Quick Reference              │
├─────────────────────────────────────────────────────┤
│ VPC CIDR:        10.0.0.0/16                        │
│ Region:          us-east-1                          │
│                                                     │
│ Public Subnets:                                     │
│   1a: 10.0.1.0/24  (subnet-0704ba19...)           │
│   1b: 10.0.2.0/24  (subnet-0dc2ca20...)           │
│                                                     │
│ Private Subnets:                                    │
│   1a: 10.0.11.0/24 (subnet-00229db6...)           │
│   1b: 10.0.12.0/24 (subnet-0adbb433...)           │
│                                                     │
│ Security Groups:                                    │
│   Web: sg-0d7db970... (80,443,3000,3001)          │
│   App: sg-04e61c0f... (3001,22)                   │
│   DB:  sg-01633b6b... (5432)                      │
│                                                     │
│ Cost: ~$35-50/month                                 │
└─────────────────────────────────────────────────────┘
```

**Save this guide for future reference!**
