import { auth, db } from './firebase-config.js';
import { collection, addDoc, onSnapshot, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

const transaccionesRef = collection(db, "transacciones");
let estadoActual = {
    saldo: 0,
    ingresosNetos: 0,
    gastosTotales: 0,
    gastosPorCategoria: {},
    primiciasDadas: 0,
    vehiculo: { costoTotal: 0, odoMin: null, odoMax: null },
    historial: []
};

// ==========================================
// SEGURIDAD Y SESIÓN
// ==========================================
window.iniciarSesion = async () => {
    const email = document.getElementById('email-login').value;
    const pass = document.getElementById('password-login').value;
    const msj = document.getElementById('login-error');
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        msj.classList.add('hidden');
    } catch (error) {
        msj.innerText = "Credenciales incorrectas.";
        msj.classList.remove('hidden');
    }
};

window.cerrarSesion = () => signOut(auth);

onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        escucharBaseDeDatos();
    } else {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('app-container').classList.add('hidden');
    }
});

// ==========================================
// LÓGICA DE REGISTRO
// ==========================================
async function guardar(tipo, monto, categoria, detalle) {
    if (!monto || monto <= 0) return window.showToast("Monto inválido", "error");
    try {
        await addDoc(transaccionesRef, { tipo, monto: Number(monto), categoria, detalle, fecha: serverTimestamp() });
        window.showToast("Registro guardado con éxito");
    } catch (e) {
        window.showToast("Error de conexión", "error");
    }
}

window.registrarNegocio = (negocio) => {
    const ing = parseFloat(document.getElementById(`${negocio}-ingreso`).value) || 0;
    const merc = parseFloat(document.getElementById(`${negocio}-mercaderia`).value) || 0;
    const gas = parseFloat(document.getElementById(`${negocio}-gastos`).value) || 0;
    const ganancia = ing - (merc + gas);
    
    if(ganancia !== 0) guardar('negocio', ganancia, negocio, `Ganancia neta ${negocio}`);
    document.getElementById(`${negocio}-ingreso`).value = '';
    document.getElementById(`${negocio}-mercaderia`).value = '';
    document.getElementById(`${negocio}-gastos`).value = '';
};

window.registrarCarga = () => {
    const costo = parseFloat(document.getElementById('vehiculo-costo').value);
    const km = parseFloat(document.getElementById('vehiculo-km').value); // Odómetro total
    if(km) guardar('vehiculo', costo, 'Combustible', km);
    document.getElementById('vehiculo-costo').value = '';
    document.getElementById('vehiculo-km').value = '';
};

window.guardarGastoFamiliar = () => {
    const desc = document.getElementById('gasto-desc').value;
    const cat = document.getElementById('gasto-categoria').value;
    const monto = parseFloat(document.getElementById('gasto-monto').value);
    if(desc && monto) guardar('gasto', monto, cat, desc);
    document.getElementById('gasto-desc').value = '';
    document.getElementById('gasto-monto').value = '';
};

// ==========================================
// SINCRONIZACIÓN Y CÁLCULOS
// ==========================================
function escucharBaseDeDatos() {
    const q = query(transaccionesRef, orderBy("fecha", "desc"));
    onSnapshot(q, (snapshot) => {
        estadoActual = {
            saldo: 0, ingresosNetos: 0, gastosTotales: 0, primiciasDadas: 0,
            gastosPorCategoria: {}, historial: [],
            vehiculo: { costoTotal: 0, odoMin: null, odoMax: null }
        };

        snapshot.forEach((doc) => {
            const data = doc.data();
            
            // Historial (Máximo 5 recientes)
            if(estadoActual.historial.length < 5) {
                estadoActual.historial.push({ desc: data.detalle || data.categoria, monto: data.monto, esIngreso: data.tipo === 'negocio' });
            }

            if (data.tipo === 'negocio') {
                estadoActual.ingresosNetos += data.monto;
                estadoActual.saldo += data.monto;
            }
            if (data.tipo === 'gasto' || data.tipo === 'vehiculo') {
                estadoActual.gastosTotales += data.monto;
                estadoActual.saldo -= data.monto;
            }
            if (data.tipo === 'gasto') {
                if(!estadoActual.gastosPorCategoria[data.categoria]) estadoActual.gastosPorCategoria[data.categoria] = 0;
                estadoActual.gastosPorCategoria[data.categoria] += data.monto;
                if(data.categoria === 'Primicias') estadoActual.primiciasDadas += data.monto;
            }
            if (data.tipo === 'vehiculo') {
                estadoActual.vehiculo.costoTotal += data.monto;
                const odo = Number(data.detalle);
                if (estadoActual.vehiculo.odoMax === null) estadoActual.vehiculo.odoMax = odo;
                estadoActual.vehiculo.odoMin = odo; // Como va del más nuevo al más viejo, el último que lea será el min
            }
        });
        actualizarInterfaz();
    });
}

function actualizarInterfaz() {
    const format = (n) => `R$ ${n.toFixed(2)}`;
    
    // Dashboard
    document.getElementById('dash-balance').innerText = format(estadoActual.saldo);
    document.getElementById('dash-balance').className = `text-3xl font-bold mt-2 ${estadoActual.saldo >= 0 ? 'text-green-900' : 'text-red-600'}`;
    document.getElementById('dash-ingresos').innerText = format(estadoActual.ingresosNetos);
    document.getElementById('dash-gastos').innerText = format(estadoActual.gastosTotales);
    document.getElementById('dash-diezmo-rec').innerText = format(estadoActual.ingresosNetos * 0.10);
    document.getElementById('dash-diezmo-dado').innerText = format(estadoActual.primiciasDadas);

    // Historial
    const histHtml = document.getElementById('dash-movimientos');
    histHtml.innerHTML = estadoActual.historial.length ? estadoActual.historial.map(h => `
        <li class="flex justify-between py-2 border-b last:border-0 text-sm">
            <span class="text-gray-700">${h.desc}</span>
            <span class="font-bold ${h.esIngreso ? 'text-green-600' : 'text-red-600'}">${h.esIngreso ? '+' : '-'}${format(h.monto)}</span>
        </li>`).join('') : '<li class="text-gray-400 text-sm">Sin movimientos</li>';

    // Vehículos (Cálculo inteligente)
    document.getElementById('vehiculo-total-costo').innerText = format(estadoActual.vehiculo.costoTotal);
    let kmRecorridos = 0;
    if(estadoActual.vehiculo.odoMax && estadoActual.vehiculo.odoMin) {
        kmRecorridos = estadoActual.vehiculo.odoMax - estadoActual.vehiculo.odoMin;
    }
    const efi = kmRecorridos > 0 ? (estadoActual.vehiculo.costoTotal / kmRecorridos).toFixed(2) : '0.00';
    document.getElementById('vehiculo-eficiencia').innerText = `${efi} R$/km`;

    // Gastos por Categoría
    const catHtml = document.getElementById('lista-categorias-gastos');
    catHtml.innerHTML = Object.entries(estadoActual.gastosPorCategoria).map(([cat, m]) => `
        <li class="p-3 flex justify-between hover:bg-gray-50">
            <span class="text-gray-700 font-medium">${cat}</span>
            <span class="font-bold text-gray-900">${format(m)}</span>
        </li>`).join('');
}

// ==========================================
// CONSEJERO BÍBLICO (IA GEMINI)
// ==========================================
window.pedirConsejoIA = async () => {
    let key = localStorage.getItem('gemini_key');
    if(!key) {
        key = prompt("Ingresa tu clave de Gemini:");
        if(key) localStorage.setItem('gemini_key', key);
        else return;
    }

    const btn = document.getElementById('btn-consejo');
    const chat = document.getElementById('chat-box');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Analizando...';
    btn.disabled = true;

    const resumen = `Saldo: ${estadoActual.saldo}, Ingresos: ${estadoActual.ingresosNetos}, Gastos: ${estadoActual.gastosTotales}, Primicias: ${estadoActual.primiciasDadas}`;
    const promptTexto = `Eres un sabio consejero financiero cristiano. Analiza este resumen de una familia: ${resumen}. Escribe 2 párrafos con aliento bíblico (cita exacta) y un consejo práctico. Usa formato HTML simple.`;

    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptTexto }] }] })
        });
        const data = await res.json();
        const respuesta = data.candidates[0].content.parts[0].text;
        
        chat.innerHTML += `
        <div class="flex items-start mt-4">
            <div class="bg-white border text-gray-800 rounded-2xl rounded-tl-none p-4 max-w-[90%] text-sm shadow-sm leading-relaxed">
                ${respuesta}
            </div>
        </div>`;
        chat.scrollTop = chat.scrollHeight;
    } catch (e) {
        window.showToast("Error al conectar con el Consejero.", "error");
    }
    btn.innerHTML = '<i class="fas fa-lightbulb mr-2"></i> Pedir Nuevo Consejo';
    btn.disabled = false;
};

document.addEventListener("DOMContentLoaded", () => {
    const verses = [
        "«Los planes del diligente ciertamente tienden a la abundancia...» - Proverbios 21:5",
        "«Honra a Jehová con tus bienes, y con las primicias de todos tus frutos...» - Proverbios 3:9"
    ];
    document.getElementById('versiculo-diario-texto').innerText = verses[Math.floor(Math.random() * verses.length)];
});