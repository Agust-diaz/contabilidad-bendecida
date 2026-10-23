import { auth, db } from './firebase-config.js';
import { collection, addDoc, onSnapshot, serverTimestamp, query, orderBy, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

const transaccionesRef = collection(db, "transacciones");
const categoriasRef = collection(db, "categorias");

let estadoActual = {
    saldoHistorico: 0,
    ingresosMes: 0,
    gastosMes: 0,
    primiciasMes: 0,
    gastosPorCategoriaMes: {},
    vehiculo: { costoTotalHistorico: 0, odoMin: null, odoMax: null },
    historial: [],
    categoriasList: []
};

// Establecer nombre del mes actual en la interfaz
const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const fechaActual = new Date();
const mesActualTxt = meses[fechaActual.getMonth()];
document.addEventListener("DOMContentLoaded", () => {
    const labelMes = document.getElementById('mes-actual-label');
    if(labelMes) labelMes.innerText = `Mes de ${mesActualTxt}`;
});

// ==========================================
// SEGURIDAD Y SESIÓN (A prueba de celulares)
// ==========================================
window.iniciarSesion = async () => {
    const msj = document.getElementById('login-error');
    
    // .trim() quita espacios al inicio/final y .toLowerCase() pasa todo a minúsculas
    const email = document.getElementById('email-login').value.trim().toLowerCase();
    const pass = document.getElementById('password-login').value;
    
    if(!email || !pass) {
        msj.innerText = "Por favor, completa los datos.";
        msj.classList.remove('hidden');
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, pass);
        msj.classList.add('hidden');
    } catch (error) {
        msj.innerText = "Credenciales incorrectas. Verifica tu correo y clave.";
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

window.registrarIngresoFijo = () => {
    const desc = document.getElementById('fijo-desc').value;
    const monto = parseFloat(document.getElementById('fijo-monto').value);
    if(desc && monto) guardarTransaccion('ingreso_fijo', monto, 'Sueldo', desc);
    document.getElementById('fijo-desc').value = ''; document.getElementById('fijo-monto').value = '';
};

window.registrarNegocio = (negocio) => {
    const ing = parseFloat(document.getElementById(`${negocio}-ingreso`).value) || 0;
    const merc = parseFloat(document.getElementById(`${negocio}-mercaderia`).value) || 0;
    const gas = parseFloat(document.getElementById(`${negocio}-gastos`).value) || 0;
    const ganancia = ing - (merc + gas);
    if(ganancia !== 0) guardarTransaccion('negocio', ganancia, negocio, `Ganancia neta ${negocio}`);
    document.getElementById(`${negocio}-ingreso`).value = ''; document.getElementById(`${negocio}-mercaderia`).value = ''; document.getElementById(`${negocio}-gastos`).value = '';
};

window.registrarCarga = () => {
    const costo = parseFloat(document.getElementById('vehiculo-costo').value);
    const km = parseFloat(document.getElementById('vehiculo-km').value);
    if(km && costo) guardarTransaccion('vehiculo', costo, 'Combustible', km);
    document.getElementById('vehiculo-costo').value = ''; document.getElementById('vehiculo-km').value = '';
};

window.guardarGastoFamiliar = () => {
    const desc = document.getElementById('gasto-desc').value;
    const cat = document.getElementById('gasto-categoria').value;
    const monto = parseFloat(document.getElementById('gasto-monto').value);
    if(desc && monto) guardarTransaccion('gasto', monto, cat, desc);
    document.getElementById('gasto-desc').value = ''; document.getElementById('gasto-monto').value = '';
};

// ==========================================
// CATEGORÍAS EN LA NUBE
// ==========================================
window.agregarCategoria = async () => {
    const input = document.getElementById('nueva-categoria');
    const nombre = input.value.trim();
    if (nombre) {
        await addDoc(categoriasRef, { nombre: nombre, fechaCreacion: serverTimestamp() });
        input.value = ''; window.showToast("Categoría agregada");
    }
};

window.eliminarCategoria = async (id) => {
    try {
        await deleteDoc(doc(db, "categorias", id));
        window.showToast("Categoría eliminada");
    } catch (e) { window.showToast("Error al eliminar", "error"); }
};

function escucharCategorias() {
    onSnapshot(categoriasRef, (snapshot) => {
        let catTemp = [{ id: 'primicias', nombre: 'Primicias' }];
        snapshot.forEach(doc => catTemp.push({ id: doc.id, nombre: doc.data().nombre }));
        estadoActual.categoriasList = catTemp;
        
        document.getElementById('gasto-categoria').innerHTML = catTemp.map(c => `<option value="${c.nombre}">${c.nombre === 'Primicias' ? '🎁 ' : ''}${c.nombre}</option>`).join('');
        document.getElementById('lista-categorias-admin').innerHTML = catTemp.map(c => `
            <li class="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100 text-sm">
                <span class="text-gray-700">${c.nombre}</span>
                ${c.id !== 'primicias' ? `<button onclick="eliminarCategoria('${c.id}')" class="text-red-400 hover:text-red-600 px-2"><i class="fas fa-times"></i></button>` : '<span class="text-gray-400 text-xs italic">Fija</span>'}
            </li>
        `).join('');
    });
}

// ==========================================
// SINCRONIZACIÓN Y CÁLCULOS (POR MES)
// ==========================================
function escucharBaseDeDatos() {
    const q = query(transaccionesRef, orderBy("fecha", "desc"));
    onSnapshot(q, (snapshot) => {
        estadoActual.saldoHistorico = 0; estadoActual.ingresosMes = 0; estadoActual.gastosMes = 0; 
        estadoActual.primiciasMes = 0; estadoActual.gastosPorCategoriaMes = {}; estadoActual.historial = [];
        estadoActual.vehiculo = { costoTotalHistorico: 0, odoMin: null, odoMax: null };

        const mesActualNum = new Date().getMonth();
        const anoActualNum = new Date().getFullYear();

        snapshot.forEach((doc) => {
            const data = doc.data();
            
            let esEsteMes = false;
            if (data.fecha) {
                const dateData = data.fecha.toDate();
                if (dateData.getMonth() === mesActualNum && dateData.getFullYear() === anoActualNum) {
                    esEsteMes = true;
                }
            } else {
                esEsteMes = true;
            }
            
            if(estadoActual.historial.length < 6) {
                estadoActual.historial.push({ 
                    desc: data.detalle || data.categoria, monto: data.monto, 
                    esIngreso: (data.tipo === 'negocio' || data.tipo === 'ingreso_fijo') 
                });
            }

            if (data.tipo === 'negocio' || data.tipo === 'ingreso_fijo') estadoActual.saldoHistorico += data.monto;
            if (data.tipo === 'gasto' || data.tipo === 'vehiculo') estadoActual.saldoHistorico -= data.monto;
            
            if (data.tipo === 'vehiculo') {
                estadoActual.vehiculo.costoTotalHistorico += data.monto;
                const odo = Number(data.detalle);
                if (estadoActual.vehiculo.odoMax === null) estadoActual.vehiculo.odoMax = odo;
                estadoActual.vehiculo.odoMin = odo; 
            }

            if (esEsteMes) {
                if (data.tipo === 'negocio' || data.tipo === 'ingreso_fijo') {
                    estadoActual.ingresosMes += data.monto;
                }
                if (data.tipo === 'gasto' || data.tipo === 'vehiculo') {
                    estadoActual.gastosMes += data.monto;
                }
                if (data.tipo === 'gasto') {
                    if(!estadoActual.gastosPorCategoriaMes[data.categoria]) estadoActual.gastosPorCategoriaMes[data.categoria] = 0;
                    estadoActual.gastosPorCategoriaMes[data.categoria] += data.monto;
                    if(data.categoria === 'Primicias') estadoActual.primiciasMes += data.monto;
                }
            }
        });
        actualizarInterfaz();
    });
}

function actualizarInterfaz() {
    const format = (n) => `R$ ${n.toFixed(2)}`;
    
    document.getElementById('dash-balance').innerText = format(estadoActual.saldoHistorico);
    document.getElementById('dash-ingresos-mes').innerText = format(estadoActual.ingresosMes);
    document.getElementById('dash-gastos-mes').innerText = format(estadoActual.gastosMes);
    document.getElementById('dash-diezmo-rec').innerText = format(estadoActual.ingresosMes * 0.10);
    document.getElementById('dash-diezmo-dado').innerText = format(estadoActual.primiciasMes);

    const histHtml = document.getElementById('dash-movimientos');
    histHtml.innerHTML = estadoActual.historial.length ? estadoActual.historial.map(h => `
        <li class="flex justify-between items-center py-2 border-b border-gray-50 last:border-0 text-sm">
            <span class="text-gray-700 font-medium truncate pr-2">${h.desc}</span>
            <span class="font-bold flex-shrink-0 ${h.esIngreso ? 'text-blue-600' : 'text-red-500'}">${h.esIngreso ? '+' : '-'}${format(h.monto)}</span>
        </li>`).join('') : '<li class="text-gray-400 text-sm italic">Sin movimientos</li>';

    document.getElementById('vehiculo-total-costo').innerText = format(estadoActual.vehiculo.costoTotalHistorico);
    let kmRecorridos = 0;
    if(estadoActual.vehiculo.odoMax !== null && estadoActual.vehiculo.odoMin !== null) {
        kmRecorridos = estadoActual.vehiculo.odoMax - estadoActual.vehiculo.odoMin;
    }
    const efi = kmRecorridos > 0 ? (estadoActual.vehiculo.costoTotalHistorico / kmRecorridos).toFixed(2) : '0.00';
    document.getElementById('vehiculo-eficiencia').innerText = `${efi}`;

    const catHtml = document.getElementById('lista-desglose-gastos');
    const desgloseItems = Object.entries(estadoActual.gastosPorCategoriaMes);
    
    if (desgloseItems.length === 0) {
        catHtml.innerHTML = '<li class="text-gray-400 text-sm italic p-2">Aún no hay gastos registrados este mes.</li>';
    } else {
        catHtml.innerHTML = desgloseItems.map(([cat, m]) => `
            <li class="p-3 flex justify-between items-center hover:bg-gray-50 text-sm">
                <span class="text-gray-700 font-medium truncate pr-2">${cat}</span>
                <span class="font-bold text-gray-900 flex-shrink-0">${format(m)}</span>
            </li>`).join('');
    }
}

// ==========================================
// CONSEJERO BÍBLICO (IA GEMINI) - RAYOS X
// ==========================================
window.pedirConsejoIA = async () => {
    let key = localStorage.getItem('gemini_key');
    
    if(!key) {
        let claveIngresada = prompt("Ingresa tu clave de Gemini (Debe empezar con AIza...):");
        if(claveIngresada) {
            key = claveIngresada.trim(); 
            localStorage.setItem('gemini_key', key);
        } else {
            return;
        }
    }

    const btn = document.getElementById('btn-consejo');
    const chat = document.getElementById('chat-box');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Buscando sabiduría...';
    btn.disabled = true;

    const resumen = `Mes de análisis: ${mesActualTxt}. Saldo Total Histórico: R$ ${estadoActual.saldoHistorico}. Ingresos en este mes: R$ ${estadoActual.ingresosMes}. Gastos en este mes: R$ ${estadoActual.gastosMes}. Primicias dadas en este mes: R$ ${estadoActual.primiciasMes}.`;
    
    const promptTexto = `Eres un sabio consejero financiero cristiano pastoral. Tus respuestas deben tener un enfoque estrictamente bíblico. Todo debe pasar por el filtro de la palabra de Dios, reconociendo que Jesús es el camino, la verdad y la vida. 
    Este es el estado de la familia Ripoll: ${resumen}. 
    Analiza la mayordomía del MES ACTUAL en un texto breve (máximo 2 párrafos). Da una palabra de aliento basada en las Escrituras (usa la cita exacta). Menciona su fidelidad en primicias. Da un consejo práctico sobre el balance del mes. Usa formato HTML simple <b>, <i>, <br>.`;

    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptTexto }] }] })
        });
        
        const data = await res.json();

        // Si Google devuelve un error, lo atrapamos con su mensaje original
        if (!res.ok) {
            throw new Error(data.error ? data.error.message : "Error desconocido en los servidores de Google.");
        }

        if (!data.candidates || data.candidates.length === 0) {
            throw new Error("Google procesó la solicitud pero no envió respuesta. Intenta de nuevo.");
        }

        const respuesta = data.candidates[0].content.parts[0].text;
        
        chat.innerHTML += `
        <div class="flex items-start mt-4">
            <div class="bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-none p-4 md:p-5 max-w-[95%] text-sm shadow-sm leading-relaxed">
                ${respuesta}
            </div>
        </div>`;
        chat.scrollTop = chat.scrollHeight;
        
    } catch (e) {
        // AQUÍ ESTÁN LOS RAYOS X: Mostrará el error exacto en el chat
        chat.innerHTML += `
        <div class="flex items-start mt-4">
            <div class="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 text-sm shadow-sm max-w-[95%]">
                <b class="block mb-1"><i class="fas fa-exclamation-triangle"></i> Error de conexión:</b> 
                ${e.message}
            </div>
        </div>`;
        chat.scrollTop = chat.scrollHeight;
        
        // Solo borramos la llave si el error menciona explícitamente que es inválida
        const mensajeError = e.message.toLowerCase();
        if (mensajeError.includes("key") || mensajeError.includes("valid") || mensajeError.includes("api")) {
            localStorage.removeItem('gemini_key');
            window.showToast("La clave no fue aceptada. Cópiala bien e intenta de nuevo.", "error");
        } else {
            window.showToast("Ocurrió un error. Revisa el mensaje en pantalla.", "error");
        }
    }
    
    btn.innerHTML = '<i class="fas fa-lightbulb mr-2"></i> Evaluar Finanzas del Mes';
    btn.disabled = false;
};
