require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3004;

app.listen(PORT, () => {
    console.log(`Microservicio de Validación y Garita corriendo en el puerto ${PORT}`);
});

