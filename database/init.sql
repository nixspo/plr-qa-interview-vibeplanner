-- Production database
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    email      VARCHAR(255) UNIQUE NOT NULL,
    full_name     VARCHAR(255) NOT NULL DEFAULT '',
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tours (
    id           SERIAL PRIMARY KEY,
    tour_number  INTEGER NOT NULL UNIQUE CHECK (tour_number BETWEEN 1000 AND 9999),
    max_volume   DOUBLE PRECISION NOT NULL,
    max_weight   DOUBLE PRECISION NOT NULL,
    range        DOUBLE PRECISION NOT NULL,
    vehicle_type VARCHAR(64) NOT NULL,
    area         JSONB,
    created_at   TIMESTAMP DEFAULT NOW(),
    updated_at   TIMESTAMP DEFAULT NOW()
);

INSERT INTO users (email, full_name, password_hash)
VALUES ('test@vibeplanner.com', 'Test User', '$2b$10$oy5CxC3gII/QB0H8x36CGOXpRwYLjLDq.4vI9nzp6hCVNITjmcAH.')
ON CONFLICT (email) DO NOTHING;

-- Test database (used by E2E tests — kept separate so test runs never touch dev data)
CREATE DATABASE vibeplanner_tests;

\connect vibeplanner_tests

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    email      VARCHAR(255) UNIQUE NOT NULL,
    full_name     VARCHAR(255) NOT NULL DEFAULT '',
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tours (
    id           SERIAL PRIMARY KEY,
    tour_number  INTEGER NOT NULL UNIQUE CHECK (tour_number BETWEEN 1000 AND 9999),
    max_volume   DOUBLE PRECISION NOT NULL,
    max_weight   DOUBLE PRECISION NOT NULL,
    range        DOUBLE PRECISION NOT NULL,
    vehicle_type VARCHAR(64) NOT NULL,
    area         JSONB,
    created_at   TIMESTAMP DEFAULT NOW(),
    updated_at   TIMESTAMP DEFAULT NOW()
);

INSERT INTO users (email, full_name, password_hash)
VALUES ('test@vibeplanner.com', 'Test User', '$2b$10$oy5CxC3gII/QB0H8x36CGOXpRwYLjLDq.4vI9nzp6hCVNITjmcAH.')
ON CONFLICT (email) DO NOTHING;
