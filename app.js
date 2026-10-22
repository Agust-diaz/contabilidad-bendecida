import { auth, db } from './firebase-config.js';
import { collection, addDoc, onSnapshot, serverTimestamp, query, orderBy, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

const transaccionesRef = collection(db, "transacciones");
const categoriasRef = collection(db, "categorias");

let estadoActual = {
    saldo: 0,
    ingresosNetos: 0,
    gastosTotales: 0,
    gastosPorCategoria: {},
    primiciasDadas: 0,
    vehiculo: { costoTotal: 0, odoMin: null, odoMax: null },
    historial: [],
    categoriasList: [] // Aquí vivirá tu lista dinámica de categorías
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
        escucharCategorias();
    } else {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('app-container').classList.add('hidden');
    }
});

// ==========================================
// LÓGICA DE REGISTRO
// ==========================================
async function guardarTransaccion(tipo, monto, categoria, detalle) {
    if (!monto || monto <= 0) return window.showToast("El monto debe ser mayor a 0", "error");
    try {
        await addDoc(transaccionesRef, { tipo, monto: Number(monto), categoria, detalle, fecha: serverTimestamp() });
        window.showToast("Guardado con éxito");
    } catch (e) {
        window.showToast("Error de conexión", "error");
    }
}

// 1. Sueldos Fijos
window.registrarIngresoFijo = () => {
    const desc = document.getElementById('fijo-desc').value;
    const monto = parseFloat(document.getElementById('fijo-monto').value);
    if(desc && monto) guardarTransaccion('ingreso_fijo', monto, 'Sueldo', desc);
    document.getElementById('fijo-desc').value = '';
    document.getElementById('fijo-monto').value = '';
};

// 2. Negocios (Luna Fem y Clínica)
window.registrarNegocio = (negocio) => {
    const ing = parseFloat(document.getElementById(`${negocio}-ingreso`).value) || 0;
    const merc = parseFloat(document.getElementById(`${negocio}-mercaderia`).value) || 0;
    const gas = parseFloat(document.getElementById(`${negocio}-gastos`).value) || 0;
    const ganancia = ing - (merc + gas);
    
    if(ganancia !== 0) guardarTransaccion('negocio', ganancia, negocio, `Ganancia neta ${negocio}`);
    document.getElementById(`${negocio}-ingreso`).value = '';
    document.getElementById(`${negocio}-mercaderia`).value = '';
    document.getElementById(`${negocio}-gastos`).value = '';
};

// 3. Vehículos
window.registrarCarga = () => {
    const costo = parseFloat(document.getElementById('vehiculo-costo').value);
    const km = parseFloat(document.getElementById('vehiculo-km').value); // Odómetro total actual
    if(km && costo) guardarTransaccion('vehiculo', costo, 'Combustible', km);
    document.getElementById('vehiculo-costo').value = '';
    document.getElementById('vehiculo-km').value = '';
};

// 4. Gastos Familiares
window.guardarGastoFamiliar = () => {
    const desc = document.getElementById('gasto-desc').value;
    const cat = document.getElementById('gasto-categoria').value;
    const monto = parseFloat(document.getElementById('gasto-monto').value);
    if(desc && monto) guardarTransaccion('gasto', monto, cat, desc);
    document.getElementById('gasto-desc').value = '';
    document.getElementById('gasto-monto').value = '';
};

// ==========================================
// CONFIGURACIÓN DE CATEGORÍAS EN LA NUBE
// ==========================================
window.agregarCategoria = async () => {
    const input = document.getElementById('nueva-categoria');
    const nombre = input.value.trim();
    if (nombre) {
        await addDoc(categoriasRef, { nombre: nombre, fechaCreacion: serverTimestamp() });
        input.value = '';
        window.showToast("Categoría agregada");
    }
};

window.eliminarCategoria = async (id) => {
    try {
        await deleteDoc(doc(db, "categorias", id));
        window.showToast("Categoría eliminada");
    } catch (e) {
        window.showToast("Error al eliminar", "error");
    }
};

function escucharCategorias() {
    onSnapshot(categoriasRef, (snapshot) => {
        let catTemp = [{ id: 'primicias', nombre: 'Primicias' }]; // Inamovible
        snapshot.forEach(doc => {
            catTemp.push({ id: doc.id, nombre: doc.data().nombre });
        });
        estadoActual.categoriasList = catTemp;
        
        // Actualizar el Dropdown del formulario
        const selectCat = document.getElementById('gasto-categoria');
        selectCat.innerHTML = catTemp.map(c => `<option value="${c.nombre}">${c.nombre === 'Primicias' ? '🎁 ' : ''}${c.nombre}</option>`).join('');
        
        // Actualizar el Panel de Administración (ocultando el botón borrar de Primicias)
        const listaAdmin = document.getElementById('lista-categorias-admin');
        listaAdmin.innerHTML = catTemp.map(c => `
            <li class="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100 text-sm">
                <span class="text-gray-700">${c.nombre}</span>
                ${c.id !== 'primicias' ? `<button onclick="eliminarCategoria('${c.id}')" class="text-red-400 hover:text-red-600 px-2"><i class="fas fa-times"></i></button>` : '<span class="text-gray-400 text-xs italic">Fija</span>'}
            </li>
        `).join('');
    });
}

// ==========================================
// SINCRONIZACIÓN Y CÁLCULOS
// ==========================================
function escucharBaseDeDatos() {
    const q = query(transaccionesRef, orderBy("fecha", "desc"));
    onSnapshot(q, (snapshot) => {
        // Reiniciamos cálculos
        estadoActual.saldo = 0; estadoActual.ingresosNetos = 0; estadoActual.gastosTotales = 0; 
        estadoActual.primiciasDadas = 0; estadoActual.gastosPorCategoria = {}; estadoActual.historial = [];
        estadoActual.vehiculo = { costoTotal: 0, odoMin: null, odoMax: null };

        snapshot.forEach((doc) => {
            const data = doc.data();
            
            // Historial (Máximo 5 recientes)
            if(estadoActual.historial.length < 5) {
                estadoActual.historial.push({ 
                    desc: data.detalle || data.categoria, 
                    monto: data.monto, 
                    esIngreso: (data.tipo === 'negocio' || data.tipo === 'ingreso_fijo') 
                });
            }

            if (data.tipo === 'negocio' || data.tipo === 'ingreso_fijo') {
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
                estadoActual.vehiculo.odoMin = odo; // El odómetro mínimo se actualiza hasta llegar al registro más antiguo
            }
        });
        actualizarInterfaz();
    });
}

function actualizarInterfaz() {
    const format = (n) => `R$ ${n.toFixed(2)}`;
    
    // Dashboard
    document.getElementById('dash-balance').innerText = format(estadoActual.saldo);
    document.getElementById('dash-ingresos').innerText = format(estadoActual.ingresosNetos);
    document.getElementById('dash-gastos').innerText = format(estadoActual.gastosTotales);
    document.getElementById('dash-diezmo-rec').innerText = format(estadoActual.ingresosNetos * 0.10);
    document.getElementById('dash-diezmo-dado').innerText = format(estadoActual.primiciasDadas);

    // Historial
    const histHtml = document.getElementById('dash-movimientos');
    histHtml.innerHTML = estadoActual.historial.length ? estadoActual.historial.map(h => `
        <li class="flex justify-between py-2 border-b border-gray-50 last:border-0 text-sm">
            <span class="text-gray-700 font-medium">${h.desc}</span>
            <span class="font-bold ${h.esIngreso ? 'text-blue-600' : 'text-red-500'}">${h.esIngreso ? '+' : '-'}${format(h.monto)}</span>
        </li>`).join('') : '<li class="text-gray-400 text-sm italic">Sin movimientos recientes</li>';

    // Vehículos (Cálculo inteligente)
    document.getElementById('vehiculo-total-costo').innerText = format(estadoActual.vehiculo.costoTotal);
    let kmRecorridos = 0;
    if(estadoActual.vehiculo.odoMax !== null && estadoActual.vehiculo.odoMin !== null) {
        kmRecorridos = estadoActual.vehiculo.odoMax - estadoActual.vehiculo.odoMin;
    }
    const efi = kmRecorridos > 0 ? (estadoActual.vehiculo.costoTotal / kmRecorridos).toFixed(2) : '0.00';
    document.getElementById('vehiculo-eficiencia').innerText = `${efi} R$/km`;

    // Gastos por Categoría
    const catHtml = document.getElementById('lista-desglose-gastos');
    catHtml.innerHTML = Object.entries(estadoActual.gastosPorCategoria).map(([cat, m]) => `
        <li class="p-3 flex justify-between hover:bg-gray-50 text-sm">
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
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Buscando sabiduría...';
    btn.disabled = true;

    const resumen = `Saldo Total: R$ ${estadoActual.saldo}. Ingresos Familiares (Sueldos y Negocios): R$ ${estadoActual.ingresosNetos}. Gastos Totales: R$ ${estadoActual.gastosTotales}. Primicias: R$ ${estadoActual.primiciasDadas}.`;
    
    // Instrucción estricta bajo tus requerimientos bíblicos
    const promptTexto = `Eres un sabio consejero financiero cristiano pastoral. Tus respuestas deben tener un enfoque estrictamente bíblico. Todo debe pasar por el filtro de la palabra de Dios, reconociendo que Jesús es el camino, la verdad y la vida. 
    Este es el estado de la familia Ripoll: ${resumen}. 
    Analiza estos números en un texto breve (máximo 2 párrafos). Da una palabra de aliento basada en las Escrituras (usa la cita exacta). Menciona su fidelidad en primicias. Da un consejo práctico. Usa formato HTML simple <b>, <i>, <br>.`;

    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptTexto }] }] })
        });
        const data = await res.json();
        const respuesta = data.candidates[0].content.parts[0].text;
        
        chat.innerHTML += `
        <div class="flex items-start mt-4">
            <div class="bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-none p-5 max-w-[95%] text-sm shadow-sm leading-relaxed">
                ${respuesta}
            </div>
        </div>`;
        chat.scrollTop = chat.scrollHeight;
    } catch (e) {
        window.showToast("Error al conectar con el Consejero.", "error");
    }
    btn.innerHTML = '<i class="fas fa-lightbulb mr-2"></i> Evaluar Finanzas Actuales';
    btn.disabled = false;
};

// Inicialización de Versículo Diario
document.addEventListener("DOMContentLoaded", () => {
    const verses = [
        "«Los planes del diligente ciertamente tienden a la abundancia...» - Proverbios 21:5",
        "«Honra a Jehová con tus bienes, y con las primicias de todos tus frutos...» - Proverbios 3:9",
        "«Porque ¿quién de vosotros, queriendo edificar una torre, no se sienta primero y calcula los gastos...?» - Lucas 14:28"
    ];
    document.getElementById('versiculo-diario-texto').innerText = verses[Math.floor(Math.random() * verses.length)];
});