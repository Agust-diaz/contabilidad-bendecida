// ==========================================================================
// 1. Consejero Bíblico y Versículos (El cimiento de nuestra app)
// ==========================================================================
const versiculosFinancieros = [
    "Honra al Señor con tus riquezas y con los primeros frutos de tus cosechas. (Proverbios 3:9)",
    "Los planes del diligente ciertamente tienden a la abundancia. (Proverbios 21:5)",
    "Porque donde esté tu tesoro, allí estará también tu corazón. (Mateo 6:21)",
    "El rico domina a los pobres, y el deudor es esclavo del acreedor. (Proverbios 22:7)",
    "Y mi Dios proveerá a todas vuestras necesidades, conforme a sus riquezas en gloria en Cristo Jesús. (Filipenses 4:19)"
];

function mostrarVersiculoDiario() {
    const contenedorVersiculo = document.getElementById('versiculo-diario-texto');
    if (contenedorVersiculo) {
        // Selecciona un versículo al azar para inspirar el día
        const indiceAleatorio = Math.floor(Math.random() * versiculosFinancieros.length);
        contenedorVersiculo.innerText = versiculosFinancieros[indiceAleatorio];
    }
}

// ==========================================================================
// 2. Estado Global (Variables que guardarán la información temporalmente)
// ==========================================================================
let categoriasGastos = ["Primicias (Diezmos y Ofrendas)", "Vivienda", "Comida", "Servicios (Luz, Agua, Wifi)"];
let saldoFamiliar = 0;

// Variables de Negocios
let lunaFemStats = { ingresos: 0, gastosMercaderia: 0, alquiler: 0 };
let clinicaNataliaStats = { ingresos: 0, gastosMercaderia: 0 }; // Sin alquiler por ahora

// Variables de Vehículo
let vehiculoStats = { totalGastoReales: 0, kilometrosRodados: 0 };

// ==========================================================================
// 3. Funciones Principales de Cálculo y Registro
// ==========================================================================

// Registrar un nuevo gasto o primicia
function registrarGasto(monto, categoria, descripcion) {
    if (monto <= 0) return alert("El monto debe ser mayor a cero.");
    
    // Aquí luego conectaremos con Firestore para guardar el gasto en la nube
    console.log(`Gasto registrado: R$${monto} en ${categoria} (${descripcion})`);
    
    // Actualizar saldo visualmente
    actualizarDashboard();
}

// Módulo: Vehículo (Combustible y Eficiencia)
function registrarCargaVehiculo(montoReales, kmActuales) {
    vehiculoStats.totalGastoReales += montoReales;
    vehiculoStats.kilometrosRodados += kmActuales;
    
    let costoPorKm = (vehiculoStats.totalGastoReales / vehiculoStats.kilometrosRodados).toFixed(2);
    
    console.log(`Registrado. Costo actual por KM: R$${costoPorKm}`);
    // Aquí actualizaremos el DOM para mostrarlo en la interfaz
}

// Módulo: Luna Fem Brasil
function registrarMovimientoLunaFem(tipo, monto) {
    if (tipo === 'ingreso') lunaFemStats.ingresos += monto;
    if (tipo === 'mercaderia') lunaFemStats.gastosMercaderia += monto;
    if (tipo === 'alquiler') lunaFemStats.alquiler += monto;
    
    calcularAporteFamiliar();
}

// Módulo: Clínica Natalia Ripoll Estética
function registrarMovimientoClinica(tipo, monto) {
    if (tipo === 'ingreso') clinicaNataliaStats.ingresos += monto;
    if (tipo === 'mercaderia') clinicaNataliaStats.gastosMercaderia += monto;
    
    calcularAporteFamiliar();
}

// Calcula cuánto dinero de los negocios entra a la familia
function calcularAporteFamiliar() {
    let gananciaLunaFem = lunaFemStats.ingresos - (lunaFemStats.gastosMercaderia + lunaFemStats.alquiler);
    let gananciaClinica = clinicaNataliaStats.ingresos - clinicaNataliaStats.gastosMercaderia;
    
    let totalAporte = gananciaLunaFem + gananciaClinica;
    console.log(`Aporte de negocios a la familia este mes: R$${totalAporte}`);
    // Aquí sumaremos este aporte al presupuesto familiar
}

// ==========================================================================
// 4. Inicialización de la Aplicación
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    // Esto se ejecuta en cuanto la página carga
    mostrarVersiculoDiario();
    
    // Aquí irán los "Event Listeners" para cuando tú o Natalia hagan clic en los botones
    // Ejemplo:
    /*
    document.getElementById('btn-guardar-gasto').addEventListener('click', () => {
        let monto = document.getElementById('input-monto').value;
        let cat = document.getElementById('select-categoria').value;
        registrarGasto(Number(monto), cat, "Registro manual");
    });
    */
});
// ==========================================================================
// 5. Consejero Bíblico con Inteligencia Artificial (API de Gemini)
// ==========================================================================

// IMPORTANTE: Para GitHub Pages, lo ideal es que la API Key no esté pública.
// Para uso personal de ustedes dos, pueden ingresarla mediante un prompt 
// la primera vez que abren la app, o guardarla en el localStorage del navegador.
let GEMINI_API_KEY = localStorage.getItem('gemini_api_key') || '';

function configurarApiKey() {
    const key = prompt("Por favor, ingresa tu API Key de Gemini para activar el Consejero Bíblico:");
    if (key) {
        GEMINI_API_KEY = key;
        localStorage.setItem('gemini_api_key', key);
        alert("Clave guardada correctamente en tu dispositivo.");
    }
}

async function consultarConsejeroBiblico() {
    if (!GEMINI_API_KEY) {
        configurarApiKey();
        if (!GEMINI_API_KEY) return; // Si cancela, no hacemos la consulta
    }

    // 1. Recopilar el contexto financiero actual
    const contextoFinanciero = `
        Estado financiero actual de la familia:
        - Saldo familiar general: R$${saldoFamiliar}
        - Luna Fem Brasil: Ingresos R$${lunaFemStats.ingresos}, Mercadería R$${lunaFemStats.gastosMercaderia}, Alquiler R$${lunaFemStats.alquiler}
        - Clínica Natalia Ripoll: Ingresos R$${clinicaNataliaStats.ingresos}, Mercadería R$${clinicaNataliaStats.gastosMercaderia}
        - Gastos de Vehículo: R$${vehiculoStats.totalGastoReales} para ${vehiculoStats.kilometrosRodados} km recorridos.
    `;

    // 2. Definir el filtro y la instrucción estricta (Prompt)
    const promptInstruccion = `
        Eres el consejero financiero de Contabilidad Bendecida, una aplicación para un matrimonio. 
        Tus respuestas deben tener un enfoque estrictamente bíblico. Todo debe pasar por el filtro de la palabra de Dios, reconociendo siempre que Jesús es el camino, la verdad y la vida. Independientemente del cálculo numérico, tus pilares y valores deben estar basados en la Biblia.
        
        Analiza este resumen financiero del mes y dales un consejo práctico y espiritual, acompañado de un versículo bíblico exacto que aplique a su situación particular (ya sea de abundancia, necesidad de ajuste en los negocios, o mayordomía de los gastos):
        ${contextoFinanciero}
    `;

    // Mostrar estado de carga en la interfaz (debes tener un div con id "respuesta-consejero" en tu HTML)
    const divRespuesta = document.getElementById('respuesta-consejero');
    if (divRespuesta) divRespuesta.innerText = "Buscando sabiduría en la Palabra... (Consultando)";

    // 3. Llamada a la API de Gemini
    try {
        const respuesta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptInstruccion }] }]
            })
        });

        const datos = await respuesta.json();
        
        if (datos.error) {
            console.error("Error en la API:", datos.error);
            if (divRespuesta) divRespuesta.innerText = "Hubo un error al consultar. Verifica tu conexión o tu API Key.";
            return;
        }

        const consejoText = datos.candidates[0].content.parts[0].text;
        
        // Mostrar el consejo en la pantalla
        if (divRespuesta) {
            divRespuesta.innerHTML = `<strong>Consejo Bíblico:</strong><br><br>${consejoText.replace(/\n/g, '<br>')}`;
        } else {
            console.log("Consejo:", consejoText);
        }

    } catch (error) {
        console.error("Error de red:", error);
        if (divRespuesta) divRespuesta.innerText = "Error de conexión al buscar el consejo.";
    }
}