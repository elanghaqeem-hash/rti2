# RTI Production Database

The live application database is SQLite and must be stored outside the disposable
container layer.

Production path inside the application container:

    /var/lib/risetin/rti.sqlite

The Docker Compose bundle maps that location to the persistent named volume
"rti_data".

Schema migrations:

- migrations/0001_leads.sql
- migrations/0002_system_parameters.sql

The build workflow creates "database/rti.sqlite.template" with both migrations
already applied and with zero fake/sample lead rows. The application itself still
uses the production database volume and the Admin-controlled migration workflow.

Never place a live production database, credentials, API keys, or customer data
inside Git or a public artifact.
