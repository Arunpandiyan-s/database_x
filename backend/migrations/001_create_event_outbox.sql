-- Migration 001: Create event_outbox and all supporting tables (idempotent)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID NOT NULL,
    college_id UUID NOT NULL,
    role VARCHAR(100) NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    metadata JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- event_outbox
CREATE TABLE IF NOT EXISTS event_outbox (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID UNIQUE NOT NULL,
    type TEXT NOT NULL,
    actor_id UUID NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    metadata JSONB,
    status TEXT NOT NULL DEFAULT 'PENDING',
    retry_count INT NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- system_alerts
CREATE TABLE IF NOT EXISTS system_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes (IF NOT EXISTS supported in PG 9.5+)
CREATE INDEX IF NOT EXISTS idx_outbox_pending ON event_outbox (status, created_at) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);
