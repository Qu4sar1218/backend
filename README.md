# Backend Express Template

A clean and scalable Express.js backend template with authentication, user management, and role-based access control.

## Features

- **Authentication System**: JWT-based authentication with refresh tokens
- **User Management**: Complete user CRUD operations with security features
- **Role-Based Access Control**: Flexible permission system with roles, modules, and actions
- **School Management**: School-based user organization
- **Security Features**: 
  - Password hashing with bcrypt
  - Account lockout after failed attempts
  - Token versioning for security
  - CORS configuration
- **Database**: PostgreSQL with Sequelize ORM
- **File Uploads**: Multer configuration for document/image handling

## Core Models

### User
- Complete user profile management
- Authentication and security fields
- School association
- Role-based permissions

### Role
- Define user roles (Admin, User, etc.)
- Associate with access rights

### Module & Action
- Modular permission system
- Define what actions users can perform

### Access Rights
- Link roles to specific actions
- Fine-grained permission control

### School
- School-based user organization

## Project Structure

```
src/
├── config/           # Configuration files
├── controllers/      # Request handlers
│   ├── auth/        # Authentication controllers
│   └── user/        # User management controllers
├── data-access/     # Database access layer
├── middleware/      # Custom middleware
├── routes/          # API routes
├── sequelize/       # Database models and migrations
│   ├── models/      # Sequelize models
│   ├── migrations/  # Database migrations
│   └── seeders/     # Database seeders
├── services/        # Business logic
├── use-cases/       # Application use cases
└── utils/           # Utility functions
```

## Getting Started

1. **Clone the template**
   ```bash
   git clone <repository-url>
   cd backend-express-template
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   - Copy `.env` file and update database credentials
   - Update `PGDATABASE` with your database name
   - Configure JWT secrets and other settings

4. **Database Setup**
   ```bash
   # Create database
   createdb your_database_name
   
   # Run migrations
   npx sequelize-cli db:migrate
   
   # (Optional) Run seeders
   npx sequelize-cli db:seed:all
   ```

5. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/logout-all` - Logout from all devices
- `POST /api/auth/change-password` - Change password
- `GET /api/auth/me` - Get current user info

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user

## Environment Variables

```env
PORT=3030
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# JWT Configuration
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# Database
PGUSER=postgres
PGDATABASE=your_database_name
PGPASSWORD=your_password
PGPORT=5432
PGHOST=localhost

# Security
BCRYPT_SALT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_TIME_MINUTES=15
```

## Customization

This template provides a solid foundation for backend APIs. To customize for your project:

1. **Add new models**: Create models in `src/sequelize/models/`
2. **Create migrations**: Use `npx sequelize-cli model:generate`
3. **Add controllers**: Implement business logic in `src/controllers/`
4. **Define routes**: Add API endpoints in `src/routes/`
5. **Implement use cases**: Add business logic in `src/use-cases/`

## Security Features

- JWT token authentication with refresh token rotation
- Password hashing using bcrypt
- Account lockout mechanism
- Token versioning for enhanced security
- CORS configuration
- Request validation and sanitization

## License

ISC License - Feel free to use this template for your projects.
