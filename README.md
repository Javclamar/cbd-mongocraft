# cbd-mongocraft

Plataforma de retos MongoDB con evaluacion automatica de consultas.

## Arquitectura de datos

- Base de plataforma: usuarios, retos y submissions.
- Base sandbox: datasets de retos donde se ejecutan las consultas.

Variables esperadas en backend:

- MONGO_URI
- MONGO_SANDBOX_URI
- SANDBOX_DB_NAME
- EVALUATION_MAX_RESULTS
- JWT_SECRET
- JWT_ACCESS_EXPIRES_IN
- JWT_REFRESH_SECRET
- JWT_REFRESH_EXPIRES_IN
- AUTH_COOKIE_NAME
- AUTH_COOKIE_SECURE
- PORT

Ver ejemplo en backend/.env.example.

## Endpoints backend

Health:

- GET /api/health

Retos:

- GET /api/challenges
- GET /api/challenges/:id
- POST /api/challenges (admin)

Usuarios:

- GET /api/users/leaderboard
- GET /api/users/leaderboard/global
- GET /api/users/leaderboard/me (usuario autenticado)
- GET /api/users/leaderboard/me/context?window=3 (usuario autenticado)

Submissions:

- GET /api/submissions (usuario autenticado)
- GET /api/submissions/:id
- POST /api/submissions (usuario autenticado)

Auth:

- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/refresh
- POST /api/auth/logout
- POST /api/auth/logout-all
- GET /api/auth/me

## Formato de query permitido

Solo se permiten:

- type: find
- type: aggregate

Ejemplo find:

{
	"type": "find",
	"collection": "products",
	"filter": { "price": { "$gte": 100 } },
	"projection": { "name": 1, "price": 1, "_id": 0 },
	"sort": { "price": -1 },
	"limit": 20
}

Ejemplo aggregate:

{
	"type": "aggregate",
	"collection": "orders",
	"pipeline": [
		{ "$match": { "status": "paid" } },
		{ "$group": { "_id": "$customerId", "total": { "$sum": "$amount" } } },
		{ "$sort": { "total": -1 } }
	],
	"limit": 20
}

## Evaluacion de score

- Correctitud: hasta 70 puntos.
- Eficiencia: hasta 20 puntos (executionTimeMillis, docs examined y keys examined comparado con baseline).
- Calidad de query: hasta 10 puntos (uso de projection/limit/sort o match temprano, complejidad de pipeline, docs por resultado y señales de uso de índice).
- Cada challenge define points (por ejemplo easy=100, medium=200, hard=300).
- Puntos otorgados al envio: awardedPoints = (normalizedScore / 100) * challenge.points.

Total:

normalizedScore = correctness + efficiency + queryQuality

## Flujo de autenticacion

1. Registra o inicia sesion en /api/auth/register o /api/auth/login.
2. El login y registro usan username y password (no email).
3. Guarda el accessToken y envialo en Authorization: Bearer <token>.
4. Usa /api/auth/refresh para renovar sesion cuando caduque el accessToken.
5. Usa /api/auth/me para recuperar perfil y estadisticas actualizadas.

Las estadisticas del perfil se recalculan automaticamente a partir de submissions evaluadas.

## Seed

Desde backend:

npm run seed

Usuarios de prueba creados por el seed:

- admin / Admin12345!
- ana / User12345!
- luis / User12345!

## Correr con Docker

Desde la raiz:

docker compose up --build

Servicios:

- Frontend: http://localhost
- Backend: http://localhost:3001
- Mongo Express: http://localhost:8081