document.addEventListener("DOMContentLoaded", async function() {
    console.log("Portal de Secretario Inicializado.");

    // Configurar el saludo de usuario personalizado
    const usuarioLogueado = sessionStorage.getItem('usuarioLogueado') || "Secretario Académico";
    const saludo = document.getElementById('saludo-usuario');
    if (saludo) {
        saludo.innerText = `Hola Bienvenid@, ${usuarioLogueado}`;
    }

    await cargarAspirantes();
});

async function cargarAspirantes() {
    try {
        const token = sessionStorage.getItem("token") || "";
        const respuesta = await fetch('/api/aspirante', {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (respuesta.ok) {
            const aspirantes = await respuesta.json();
            
            // Actualizar contador del dashboard
            const statAspirantes = document.getElementById("stat-aspirantes");
            if (statAspirantes) statAspirantes.innerText = aspirantes.length;

            // Renderizar la tabla de aspirantes
            const tbody = document.getElementById("tablaAspirantesSecretario");
            if (!tbody) return;
            
            tbody.innerHTML = "";
            aspirantes.forEach(asp => {
                const tr = document.createElement("tr");
                const nombreCompleto = `${asp.nombre || ''} ${asp.primerApellido || ''} ${asp.segundoApellido || ''}`.trim();
                
                tr.innerHTML = `
                    <td>${nombreCompleto || "Sin nombre"}</td>
                    <td>${asp.correo || "Sin correo"}</td>
                    <td>${asp.telefono || "Sin teléfono"}</td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            console.error("Error al cargar aspirantes");
        }
    } catch (error) {
        console.error("Error de conexión:", error);
    }
}



/**
 * Control de Navegación Lateral (Cambio de Secciones)
 */
function switchView(viewId) {
    mostrarLoader();

    // Ocultar todas las secciones y quitar fade-in
    const sections = document.querySelectorAll('.view-section');
    sections.forEach(sec => {
        sec.style.display = 'none';
        sec.classList.remove('fade-in');
    });

    // Mostrar sección de destino con fade-in
    const targetSection = document.getElementById(`view-${viewId}`);
    if (targetSection) {
        targetSection.style.display = 'block';
        void targetSection.offsetWidth; // Trigger reflow
        targetSection.classList.add('fade-in');
    }
    
    setTimeout(() => {
        ocultarLoader();
    }, 300);

    // Actualizar clase activa en enlaces de navegación
    const navLinks = document.querySelectorAll('.sidebar a');
    navLinks.forEach(link => link.classList.remove('active'));

    const activeNavLink = document.getElementById(`nav-${viewId}`);
    if (activeNavLink) {
        activeNavLink.classList.add('active');
    }
}




