ALTER TABLE users ADD COLUMN auth_subject UUID UNIQUE;
CREATE TABLE family_invites (
    id UUID PRIMARY KEY,
    family_id UUID NOT NULL REFERENCES families(id),
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_by UUID REFERENCES users(id)
);
CREATE TABLE care_batches (
    id UUID PRIMARY KEY,
    family_id UUID NOT NULL REFERENCES families(id),
    request_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);
