# GarageGo

GarageGo is a garage management project with an ASP.NET Core backend and React frontend.

## Backend

The backend is in `Backend/` and uses:

- ASP.NET Core Web API
- Entity Framework Core
- PostgreSQL
- Swagger for API testing

Run it with:

```powershell
cd Backend
dotnet restore
dotnet build
dotnet run
```

The local PostgreSQL connection is configured in `Backend/appsettings.json`.

## Frontend

The main frontend is in `frontend/`.

Run it with:

```powershell
cd frontend
npm install
npm start
```
