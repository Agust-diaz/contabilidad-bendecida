// ==========================================
// CONSEJERO BÍBLICO (IA GEMINI)
// ==========================================
window.pedirConsejoIA = async () => {
    let key = localStorage.getItem('gemini_key');
    
    // Si no hay llave, la pedimos y le quitamos los espacios accidentales
    if(!key) {
        let claveIngresada = prompt("Ingresa tu clave de Gemini:");
        if(claveIngresada) {
            key = claveIngresada.trim(); // .trim() elimina espacios invisibles
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
        
        // Si Google rechaza la llave (Error 400)
        if (!res.ok) {
            throw new Error("Clave rechazada por Google");
        }

        const data = await res.json();
        const respuesta = data.candidates[0].content.parts[0].text;
        
        chat.innerHTML += `
        <div class="flex items-start mt-4">
            <div class="bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-none p-4 md:p-5 max-w-[95%] text-sm shadow-sm leading-relaxed">
                ${respuesta}
            </div>
        </div>`;
        chat.scrollTop = chat.scrollHeight;
    } catch (e) {
        // Si hay error, borramos la llave mala para que la vuelva a pedir
        localStorage.removeItem('gemini_key');
        window.showToast("Error con la Clave. Se borró para que intentes de nuevo.", "error");
    }
    
    btn.innerHTML = '<i class="fas fa-lightbulb mr-2"></i> Evaluar Finanzas del Mes';
    btn.disabled = false;
};

// Inicialización de Versículo Diario
document.addEventListener("DOMContentLoaded", () => {
    const verses = [
        "«Los planes del diligente ciertamente tienden a la abundancia...» - Proverbios 21:5",
        "«Todo tiene su tiempo, y todo lo que se quiere debajo del cielo tiene su hora» - Eclesiastés 3:1",
        "«Porque ¿quién de vosotros, queriendo edificar una torre, no se sienta primero y calcula los gastos...?» - Lucas 14:28"
    ];
    document.getElementById('versiculo-diario-texto').innerText = verses[Math.floor(Math.random() * verses.length)];
});
