// Importamos las herramientas en la versión 13.1.0
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
// (Omitimos Analytics por ahora para mantener la app ligera y enfocada)

// La configuración exacta de Contabilidad Bendecida
const firebaseConfig = {
    apiKey: "AIzaSyClB75guA8wMMrlHOJipq-7VwPVo99-Yis",
    authDomain: "contabilidad-bendecida.firebaseapp.com",
    projectId: "contabilidad-bendecida",
    storageBucket: "contabilidad-bendecida.firebasestorage.app",
    messagingSenderId: "284334437609",
    appId: "1:284334437609:web:8487b537f1984e8505ec78",
    measurementId: "G-SLX34RSNSR"
};

// Inicializamos la aplicación
const app = initializeApp(firebaseConfig);

// Inicializamos la Base de Datos y la Seguridad
const db = getFirestore(app);
const auth = getAuth(app);

// Exportamos 'db' y 'auth' para que tu app.js tenga acceso a la llave
export { db, auth };