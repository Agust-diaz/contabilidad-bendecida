// Importamos las herramientas necesarias directamente desde los servidores de Google
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// ==========================================================================
// TUS LLAVES DE ACCESO A LA BASE DE DATOS (Reemplaza con tus datos reales)
// ==========================================================================
const firebaseConfig = {
  apiKey: "TU_API_KEY_AQUI",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID"
};

// Inicializamos Firebase
const app = initializeApp(firebaseConfig);

// Inicializamos la Base de Datos (Firestore) y la Autenticación (Auth)
const db = getFirestore(app);
const auth = getAuth(app);

// Exportamos 'db' y 'auth' para que app.js pueda usarlos para guardar los gastos
export { db, auth };