# Volunteer Help Request System

## Overview
This module allows volunteers who have claimed a flood request (SOS task) to request help from other nearby volunteers. The requested volunteer can accept or reject the help request with a reason.

## Features
1. **Find Nearby Volunteers**: Get list of available volunteers in the same region
2. **Request Help**: Send help request with custom message
3. **Accept/Reject**: Respond to help requests with optional message
4. **Track Requests**: View sent and received help requests
5. **Real-time Notifications**: Both volunteers get notified of requests and responses

## Database Migration Required

Run this SQL after schema changes:
```sql
-- Create help request status enum
CREATE TYPE "HelpRequestStatus" AS ENUM ('pending', 'accepted', 'rejected', 'completed');

-- Create volunteer_help_requests table
CREATE TABLE "volunteer_help_requests" (
    "id" TEXT NOT NULL,
    "floodRequestId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "requestedTo" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "HelpRequestStatus" NOT NULL DEFAULT 'pending',
    "responseMessage" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "volunteer_help_requests_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "volunteer_help_requests_requestedTo_status_idx" ON "volunteer_help_requests"("requestedTo", "status");
CREATE INDEX "volunteer_help_requests_floodRequestId_idx" ON "volunteer_help_requests"("floodRequestId");

-- Add foreign key constraint
ALTER TABLE "volunteer_help_requests" ADD CONSTRAINT "volunteer_help_requests_floodRequestId_fkey" FOREIGN KEY ("floodRequestId") REFERENCES "flood_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

## API Endpoints

### 1. Get Nearby Volunteers
```
GET /volunteer-help/nearby/:floodRequestId
```
Returns list of volunteers in the same region (excluding current volunteer)

### 2. Request Help
```
POST /volunteer-help
Body: {
  floodRequestId: string;
  requestedTo: string;
  message: string;
}
```

### 3. Get Received Requests (Inbox)
```
GET /volunteer-help/received?status=pending
```

### 4. Get Sent Requests (Outbox)
```
GET /volunteer-help/sent
```

### 5. Get Help Requests for Task
```
GET /volunteer-help/task/:floodRequestId
```

### 6. Respond to Help Request
```
PATCH /volunteer-help/:id/respond
Body: {
  status: 'accepted' | 'rejected';
  responseMessage?: string;
}
```

### 7. Get Statistics
```
GET /volunteer-help/stats
```

## Frontend Components

1. **Help Requests Page** (`/dashboard/volunteer/help-requests`)
   - View received and sent help requests
   - Accept/reject with custom messages
   - Track request status

2. **Request Help Button Component**
   - Can be added to any task card
   - Shows nearby volunteers
   - Send help request with custom message

## Usage Flow

1. Volunteer A claims a flood request
2. If Volunteer A needs help, they click "Request Help" on the task
3. System shows nearby volunteers
4. Volunteer A selects a volunteer and provides reason
5. Volunteer B receives notification and sees request in inbox
6. Volunteer B can accept (with note) or reject (with reason)
7. Volunteer A gets notified of the response
8. If accepted, both volunteers coordinate on the task
