FROM postgres:16-alpine
ENV POSTGRES_DB=bankdb
ENV POSTGRES_USER=bankadmin
ENV POSTGRES_PASSWORD=Bank@Admin123
COPY init.sql /docker-entrypoint-initdb.d/
EXPOSE 5432