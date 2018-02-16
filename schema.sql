create table info (
    id serial primary key,
    date TIMESTAMP not null DEFAULT current_timestamp,
    name varchar(64) not null,
    email varchar(64) not null,
    ssn varchar(64) not null,
    amount integer not null
);