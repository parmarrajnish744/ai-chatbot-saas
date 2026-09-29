-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Row Level Security (RLS) Policies
-- 1. Contacts
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_contacts ON contacts
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

-- 2. Conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_conversations ON conversations
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

-- 3. Messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_messages ON messages
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

-- 4. Knowledge Chunks
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_knowledge ON knowledge_chunks
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

-- 5. Products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_products ON products
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

-- 6. Appointments
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_appointments ON appointments
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

-- 7. Automation Workflows
ALTER TABLE automation_workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_workflows ON automation_workflows
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

-- 8. Usage Metrics
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_metrics ON usage_metrics
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);
