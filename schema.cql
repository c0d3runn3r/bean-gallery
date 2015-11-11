CREATE KEYSPACE bg WITH replication = {'class': 'NetworkTopologyStrategy', 'AWS_VPC_US_WEST_2': '2'}  AND durable_writes = true;
CREATE TABLE bg.art (
    id timeuuid PRIMARY KEY,
    metadata text,
    image blob
);
