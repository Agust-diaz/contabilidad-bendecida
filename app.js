// ==========================================================================
// IMPORTACIONES (Versión 13.1.0 para coincidir con tu firebase-config.js)
// ==========================================================================
import { auth, db } from './firebase-config.js';
import { collection, addDoc, onSnapshot, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

const transaccionesRef = collection(db, "transacciones");

// ==========================================================================
// 1. SEGURIDAD Y CONTROL DE SESIÓN
// ==========================================================================
window.iniciarSesion = async () => {
    const email = document.getElementById('email-login').value;
    const pass = document.getElementById('password-login').value;
    const msjError = document.getElementById('login-error');
    
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        msjError.style.display = "none";
    } catch (error) {
        console.error("Error al iniciar sesión:", error);
        msjError.innerText = "Credenciales incorrectas. Verifica tu acceso.";
        msjError.style.display = "block";
    }
};

window.cerrarSesion = () => signOut(auth);

onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('pantalla-login').style.display = 'none';
        document.getElementById('pantalla-dashboard').style.display = 'block';
        escucharBaseDeDatos(); // Solo lee la base de datos si hay sesión activa
    } else {
        document.getElementById('pantalla-login').style.display = 'flex';
        document.getElementById('pantalla-dashboard').style.display = 'none';
    }
});

// ==========================================================================
// 2. VERSÍCULOS DIARIOS
// ==========================================================================
const versiculosFinancieros = [
    "Honra al Señor con tus riquezas y con los primeros frutos de tus cosechas. (Proverbios 3:9)",
    "Los planes del diligente ciertamente tienden a la abundancia. (Proverbios 21:5)",
    "Porque donde esté tu tesoro, allí estará también tu corazón. (Mateo 6:21)",
    "El rico domina a los pobres, y el deudor es esclavo del acreedor. (Proverbios 22:7)",
    "Y mi Dios proveerá a todas vuestras necesidades, conforme a sus riquezas en gloria. (Filipenses 4:19)"
];

function mostrarVersiculoDiario() {
    const contenedor = document.getElementById('versiculo-diario-texto');
    if (contenedor) {
        const indiceAleatorio = Math.floor(Math.random() * versiculosFinancieros.length);
        contenedor.innerText = versiculosFinancieros[indiceAleatorio];
    }
}

// ==========================================================================
// 3. ESTADO GLOBAL (Sincronizado desde Firestore)
// ==========================================================================
let estadoActual = {
    saldoFamiliar: 0,
    lunaFem: { ingresos: 0, gastosMercaderia: 0, alquiler: 0 },
    clinica: { ingresos: 0, gastosMercaderia: 0 },
    vehiculo: { totalGastoReales: 0, kilometrosRodados: 0 }
};

// ==========================================================================
// 4. GUARDAR Y LEER EN LA NUBE (FIRESTORE)
// ==========================================================================
async function guardarEnNube(tipo, monto, categoria, detalleExtra = "") {
    if (monto <= 0) {
        alert("El monto debe ser mayor a cero.");
        return;
    }
    try {
        await addDoc(transaccionesRef, {
            tipo: tipo,
            monto: Number(monto),
            categoria: categoria,
            detalle: detalleExtra,
            fecha: serverTimestamp()
        });
        alert("Registro guardado correctamente.");
    } catch (error) {
        console.error("Error guardando en la nube:", error);
        alert("Hubo un error al guardar. Revisa tu conexión.");
    }
}

window.registrarGasto = (monto, categoria, descripcion) => guardarEnNube('gasto_familiar', monto, categoria, descripcion);
window.registrarMovimientoLunaFem = (categoria, monto) => guardarEnNube('luna_fem', monto, categoria, "");
window.registrarMovimientoClinica = (categoria, monto) => guardarEnNube('clinica', monto, categoria, "");
window.registrarCargaVehiculo = (montoReales, kmActuales) => guardarEnNube('vehiculo', montoReales, "Combustible", kmActuales);

function escucharBaseDeDatos() {
    const q = query(transaccionesRef, orderBy("fecha", "desc"));
    
    onSnapshot(q, (snapshot) => {
        estadoActual = {
            saldoFamiliar: 0,
            lunaFem: { ingresos: 0, gastosMercaderia: 0, alquiler: 0 },
            clinica: { ingresos: 0, gastosMercaderia: 0 },
            vehiculo: { totalGastoReales: 0, kilometrosRodados: 0 }
        };

        snapshot.forEach((doc) => {
            const data = doc.data();
            
            if (data.tipo === 'gasto_familiar') estadoActual.saldoFamiliar -= data.monto;
            
            if (data.tipo === 'luna_fem') {
                if (data.categoria === 'ingreso') estadoActual.lunaFem.ingresos += data.monto;
                if (data.categoria === 'mercaderia') estadoActual.lunaFem.gastosMercaderia += data.monto;
                if (data.categoria === 'alquiler') estadoActual.lunaFem.alquiler += data.monto;
            }

            if (data.tipo === 'clinica') {
                if (data.categoria === 'ingreso') estadoActual.clinica.ingresos += data.monto;
                if (data.categoria === 'mercaderia') estadoActual.clinica.gastosMercaderia += data.monto;
            }

            if (data.tipo === 'vehiculo') {
                estadoActual.vehiculo.totalGastoReales += data.monto;
                estadoActual.vehiculo.kilometrosRodados += Number(data.detalle);
            }
        });
    });
}

// ==========================================================================
// 5. CONSEJERO BÍBLICO (IA GEMINI)
// ==========================================================================
let GEMINI_API_KEY = localStorage.getItem('gemini_api_key') || '';

function configurarApiKey() {
    const key = prompt("Por favor, ingresa tu API Key de Gemini para el Consejero Bíblico:");
    if (key) {
        GEMINI_API_KEY = key;
        localStorage.setItem('gemini_api_key', key);
        alert("Clave guardada en tu dispositivo.");
    }
}

window.consultarConsejeroBiblico = async () => {
    if (!GEMINI_API_KEY) {
        configurarApiKey();
        if (!GEMINI_API_KEY) return;
    }

    const aporteLunaFem = estadoActual.lunaFem.ingresos - (estadoActual.lunaFem.gastosMercaderia + estadoActual.lunaFem.alquiler);
    const aporteClinica = estadoActual.clinica.ingresos - estadoActual.clinica.gastosMercaderia;
    const costoKm = estadoActual.vehiculo.kilometrosRodados > 0 
        ? (estadoActual.vehiculo.totalGastoReales / estadoActual.vehiculo.kilometrosRodados).toFixed(2) 
        : 0;

    const contextoFinanciero = `
        Estado actual:
        - Gastos familiares: R$${Math.abs(estadoActual.saldoFamiliar)}
        - Ganancia Luna Fem: R$${aporteLunaFem} (Ingresos: ${estadoActual.lunaFem.ingresos}, Gastos: ${estadoActual.lunaFem.gastosMercaderia}, Alquiler: ${estadoActual.lunaFem.alquiler})
        - Ganancia Clínica Natalia Ripoll: R$${aporteClinica} (Ingresos: ${estadoActual.clinica.ingresos}, Gastos: ${estadoActual.clinica.gastosMercaderia})
        - Vehículo: R$${estadoActual.vehiculo.totalGastoReales} gastados, Costo por km: R$${costoKm}
    `;

    const promptInstruccion = `
        Eres el consejero financiero de Contabilidad Bendecida, una app para un matrimonio cristiano. 
        Tus respuestas deben tener un enfoque estrictamente bíblico. Todo debe pasar por el filtro de la palabra de Dios, reconociendo que Jesús es el camino, la verdad y la vida.
        Analiza este resumen financiero y dales un consejo práctico y espiritual, acompañado de un versículo bíblico exacto:
        ${contextoFinanciero}
    `;

    const divRespuesta = document.getElementById('respuesta-consejero');
    if (divRespuesta) divRespuesta.innerText = "Buscando sabiduría en la Palabra... (Consultando)";

    try {
        const respuesta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptInstruccion }] }] })
        });

        const datos = await respuesta.json();
        
        if (datos.error) {
            console.error("Error API:", datos.error);
            if (divRespuesta) divRespuesta.innerText = "Hubo un error al consultar. Verifica tu API Key de Gemini.";
            return;
        }

        const consejoText = datos.candidates[0].content.parts[0].text;
        if (divRespuesta) divRespuesta.innerHTML = `<strong>Consejo Bíblico:</strong><br><br>${consejoText.replace(/\n/g, '<br>')}`;

    } catch (error) {
        console.error("Error de red:", error);
        if (divRespuesta) divRespuesta.innerText = "Error de conexión al buscar el consejo.";
    }
};

// ==========================================================================
// INICIALIZACIÓN BÁSICA
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    mostrarVersiculoDiario();
});