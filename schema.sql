create table users {
    id serial primary key,
    date varchar(64) not null,
    name varchar(64) not null,
    email varchar(64) not null,
    ssn varchar(64) not null,
    amount integer not null
}