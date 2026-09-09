create table if not exists polls (
  poll text not null, week integer not null, season integer not null, ranks text not null,
  fetched_at text not null default (datetime('now')), primary key (poll, week, season)
);
