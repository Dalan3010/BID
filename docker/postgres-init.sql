-- Runs only when the Postgres volume is created for the first time.
-- A separate database keeps integration tests away from development data.

CREATE DATABASE bid_test;
