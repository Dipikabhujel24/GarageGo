# GarageGo

GarageGo is a garage management project with an ASP.NET Core backend and a React frontend.

## Backend

The backend is in `Backend/` and uses:

- ASP.NET Core Web API
- Entity Framework Core
- SQLite for local development
- Swagger for API testing

Run it with:

```powershell
cd Backend
dotnet restore
dotnet build
dotnet run
```

## Frontend

The main frontend is in `frontend/`.

Run it with:

```powershell
cd frontend
npm install
npm start
```

## Notes

- The default backend connection string is configured in `Backend/appsettings.json`.
- The customer portal uses the `/api/auth/*` and `/api/customers/*` routes.
