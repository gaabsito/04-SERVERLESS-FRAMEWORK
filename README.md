# Venue Control

Aplicación React Native/Expo para consultar espacios y demostrar operaciones CRUD sobre una API Serverless en AWS.

## Arquitectura

React Native Web → fetch en mobile/src/api.ts → API Gateway REST → Lambda Node.js 22 (backend/src/zones.ts) → respuesta JSON y CloudWatch.

backend/ y mobile/ tienen manifiestos y dependencias separados. Los tipos del cliente no importan código del servidor.

## Modelo y decisiones

Un espacio contiene id, name, capacity y status. Estados permitidos: OPEN, FULL y CLOSED. Nombre de 1–100 caracteres tras trim; capacidad entera positiva y segura. El cliente valida formularios y el servidor valida toda entrada externa.

El catálogo tiene cuatro espacios fijos. POST, PUT, PATCH y DELETE son **simulados y no persisten**; la respuesta incluye simulated: true. El cliente muestra el resultado sin modificar el catálogo de forma optimista. POST devuelve ZONE-NEW; una consulta posterior no encontrará ese id.

GET /zones lista; GET /zones/{id} consulta. POST /zones exige name, capacity y status y responde 201. PUT /zones/{id} exige objeto completo. PATCH /zones/{id} sólo admite status. DELETE /zones/{id} simula eliminación. Recursos desconocidos: 404. Entrada inválida: 400. Éxitos salvo POST: 200. Errores y respuestas incluyen CORS.

Un handler despacha por httpMethod y resource. Es válido compartir Lambda entre las seis rutas; Serverless declara cada combinación explícitamente. pathParameters.id proviene de {id}; body es texto y se analiza como unknown antes de validarlo. PUT sustituye un objeto completo; PATCH solicita sólo un campo.

## Ejecución local en macOS

Usa Node 22 (nvm use 22 si utilizas nvm). Desde backend:

```sh
npm ci
npm run typecheck
npm start
```

Offline sirve http://localhost:3001/dev. En mobile/src/api.ts cambia API_URL a esa base para probar local. Desde mobile, en otra terminal:

```sh
npm ci
npm run typecheck
npm run web -- --port 8082
```

La app abre en http://localhost:8082. Tiene listado, detalle, creación y edición; PATCH y confirmación de DELETE están en detalle. Los botones se bloquean durante cada petición; se muestran errores recuperables.

## AWS

Servicio: venue-control-gabriel-galan-dev. Región: us-west-2. Rol existente del laboratorio: LabRole. No se crean roles IAM nuevos. Credenciales temporales en el perfil academy fuera del repositorio.

```sh
cd backend
aws sts get-caller-identity --profile academy --region us-west-2
npm run build
npx serverless deploy --aws-profile academy
npx serverless info --aws-profile academy
```

Base desplegada: https://vkmt2bkh68.execute-api.us-west-2.amazonaws.com/dev

La configuración final del cliente apunta a esa base. No necesita que Offline esté activo. Expo sigue sirviendo el cliente en local; no se ha publicado un hosting de la web.

```sh
aws logs tail /aws/lambda/venue-control-gabriel-galan-dev-zones --profile academy --region us-west-2 --since 10m
```

## Pruebas y evidencias

```sh
cd backend
python3 scripts/check-api.py http://localhost:3001/dev
python3 scripts/check-api.py https://vkmt2bkh68.execute-api.us-west-2.amazonaws.com/dev
```

Cada ejecución comprueba 30 peticiones más preflight CORS: seis operaciones, 400, 404, capacidades inválidas, estados, forma del JSON y ausencia de persistencia. Guarda body, estado y respuesta en backend/evidencias/local-api.json o cloud-api.json. Los archivos curl-*.txt registran ejecuciones reales de GET, POST y PATCH.

Importa backend/evidencias/venue-control.postman_collection.json en Thunder Client (importación de colección Postman) para repetir manualmente todas las operaciones. GET, POST, PUT, PATCH y DELETE ejecutados en Thunder Client con estados 200/201. Las capturas reales y el informe están en evidencias/Informe-evidencias.html.

La defensa individual sigue pendiente: debes poder explicar el flujo de una petición, event, handler, body, rutas, código HTTP, Offline, API Gateway, Lambda, CORS y cambio local/cloud. Las evidencias técnicas no acreditan esa explicación personal.

## Límites

Sin autenticación ni persistencia: es una demostración del laboratorio con datos ficticios. No introducir datos reales. Las credenciales Academy caducan; renovar el perfil fuera de Git cuando sea necesario. Se mantienen las versiones Expo del cuadernillo; npm informa vulnerabilidades transitivas y conviene revisar sus actualizaciones antes de un uso fuera del aula.

## Revisión de requisitos de entrega

- Backend y mobile separados; seis rutas definidas en serverless.yml.
- Offline: arranque, rutas e invocaciones en evidencias/serverless-offline.txt.
- Thunder Client local: cinco capturas thunder-local-*.png (GET, POST, PUT, PATCH, DELETE).
- Thunder Client AWS: ev-get.png, ev-post.png, ev-put.png, ev-patch.png y ev-delete.png.
- Curl: GET, POST y PATCH ejecutados en local y AWS; respuestas en TXT.
- Cliente local: app-local.png; cliente AWS y logs: venue-control*.png y cloudwatch.json.
- Informe con capturas del alumno: evidencias/Informe-evidencias.html.
- Defensa individual pendiente de realizar por el alumno; no es un archivo que pueda acreditarla.

El repositorio contiene exclusivamente Venue Control, la parte evaluable, y conserva SDK 54 del cuadernillo. Para Expo Go se requiere una versión compatible; la demostración admitida es React Native Web. Las dependencias instaladas y los archivos generados quedan excluidos de Git.
