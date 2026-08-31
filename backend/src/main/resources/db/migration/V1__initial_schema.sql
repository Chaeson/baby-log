CREATE TABLE families (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(320) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE family_members (
    id UUID PRIMARY KEY,
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('OWNER', 'PARENT', 'CAREGIVER')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uk_family_members_family_user UNIQUE (family_id, user_id)
);

CREATE TABLE children (
    id UUID PRIMARY KEY,
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    nickname VARCHAR(100),
    birth_order INTEGER NOT NULL CHECK (birth_order > 0),
    birth_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uk_children_family_birth_order UNIQUE (family_id, birth_order)
);

CREATE TABLE baby_events (
    id UUID PRIMARY KEY,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    event_type VARCHAR(30) NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    memo VARCHAR(1000),
    created_by_user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE feeding_events (
    baby_event_id UUID PRIMARY KEY REFERENCES baby_events(id) ON DELETE CASCADE,
    amount_ml INTEGER NOT NULL CHECK (amount_ml > 0)
);

CREATE TABLE diaper_events (
    baby_event_id UUID PRIMARY KEY REFERENCES baby_events(id) ON DELETE CASCADE,
    diaper_type VARCHAR(10) NOT NULL CHECK (diaper_type IN ('PEE', 'POOP', 'BOTH'))
);

CREATE TABLE sleep_events (
    baby_event_id UUID PRIMARY KEY REFERENCES baby_events(id) ON DELETE CASCADE,
    ended_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_children_family ON children(family_id, birth_order);
CREATE INDEX idx_baby_events_child_occurred ON baby_events(child_id, occurred_at DESC);
CREATE INDEX idx_baby_events_created_by ON baby_events(created_by_user_id);
