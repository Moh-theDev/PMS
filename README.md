# PMS (Productivity Management System)

A modern, AI-powered productivity management system built with a .NET 9 backend and a React/Vite frontend.

## Technologies Used

**Backend:**
- .NET 9.0 (ASP.NET Core Web API)
- Entity Framework Core 9.0
- SQL Server
- Google Gemini API (for AI scheduling and assistant features)
- MediatR (CQRS pattern)

**Frontend:**
- React 19
- Vite
- Tailwind CSS 4.0
- Zustand (State Management)
- Shadcn UI / Radix UI Primitives

## Prerequisites

Before you begin, ensure you have the following installed on your machine:
- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) (v18.0 or higher)
- [.NET 9.0 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- SQL Server (LocalDB for Windows, or SQL Server Docker container for Linux/Mac)

## Cloning the Repository

```bash
git clone <repository-url>
cd PMS
```

## Running Locally

### 1. Backend Setup (.NET 9 Web API)

The backend is built with ASP.NET Core and Entity Framework. It requires a SQL Server database and a Gemini API Key to function.

**Step 1: Configure AppSettings**
Navigate to the backend project directory:
```bash
cd BackEnd/PMS
```

Open `appsettings.json` (or create `appsettings.Development.json`) and update the SQL Server connection string.
You will also need to provide your Gemini API key.

**Step 2: Apply Database Migrations**
If you have the EF Core CLI tools installed, run the following commands to create the database:
```bash
dotnet ef database update --project ../PMS.Infrastructre --startup-project .
```
*(If you don't have EF Core tools, install them via: `dotnet tool install --global dotnet-ef`)*

**Step 3: Run the Backend Server**
```bash
dotnet run
```
The backend API will start running (typically on `https://localhost:7198` or `http://localhost:5221`).

### 2. Frontend Setup (React + Vite)

Open a new terminal window and navigate to the root directory, then into the frontend folder:
```bash
cd FrontEnd
```

**Step 1: Install Dependencies**
Using npm:
```bash
npm install
```

**Step 2: Environment Variables**
By default, the Vite proxy or API service is configured to talk to your local backend. If your backend is running on a different port than the default, create a `.env` file in the `FrontEnd` directory and set the API base URL (e.g., `VITE_API_BASE_URL=https://localhost:7198`).

**Step 3: Run the Development Server**
```bash
npm run dev
```

The frontend will start running (typically on `http://localhost:5173`). Open this URL in your browser to access the application.

## Linux Considerations

If you are running on **Linux**, SQL Server LocalDB (which is common on Windows) is not natively available. The easiest way to run the database on Linux is using a Docker container for SQL Server.

1. **Run SQL Server in Docker:**
   ```bash
   sudo docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStrong!Passw0rd" -p 1433:1433 -d mcr.microsoft.com/mssql/server:2022-latest
   ```
2. **Update your Connection String:**
   In your `BackEnd/PMS/appsettings.json`, update the connection string to point to the Docker instance:
   ```json
   "ConnectionStrings": {
     "DefaultConnection": "Server=localhost,1433;Database=PMSDb;User Id=sa;Password=YourStrong!Passw0rd;TrustServerCertificate=True"
   }
   ```