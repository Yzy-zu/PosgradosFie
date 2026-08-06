let currentStep = 1;
const totalSteps = 4;

function updateWizardUI() {
    // Mostrar u ocultar pasos
    for (let i = 1; i <= totalSteps; i++) {
        const stepDiv = document.getElementById(`step-${i}`);
        if (stepDiv) stepDiv.classList.remove('active');

        const ind = document.getElementById(`ind-${i}`);
        if (ind) {
            if (i < currentStep) {
                ind.className = 'wizard-step-indicator completed';
            } else if (i === currentStep) {
                ind.className = 'wizard-step-indicator active';
            } else {
                ind.className = 'wizard-step-indicator';
            }
        }
    }
    
    const activeStep = document.getElementById(`step-${currentStep}`);
    if (activeStep) activeStep.classList.add('active');

    // Animar el ancho del layout: angosto en paso 1, ancho en pasos 2-4
    const layout = document.getElementById('mainLayout');
    if (layout) {
        if (currentStep === 1) {
            layout.classList.remove('wide-layout');
        } else {
            layout.classList.add('wide-layout');
        }
    }

    // Barra de progreso
    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
        const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
        progressFill.style.width = `${progress}%`;
    }

    // Botones de navegación
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    const btnSubmit = document.getElementById('btnSubmit');

    if (btnPrev) btnPrev.style.display = currentStep > 1 ? 'flex' : 'none';
    if (btnNext && btnSubmit) {
        if (currentStep === totalSteps) {
            btnNext.style.display = 'none';
            btnSubmit.style.display = 'flex';
        } else {
            btnNext.style.display = 'flex';
            btnSubmit.style.display = 'none';
        }
    }
}

function validateCurrentStep() {
    const currentStepDiv = document.getElementById(`step-${currentStep}`);
    if (!currentStepDiv) return true;

    const inputs = currentStepDiv.querySelectorAll('input[required], select[required]');
    let isValid = true;
    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.style.borderColor = '#ef4444';
            isValid = false;
        } else {
            input.style.borderColor = 'transparent';
        }
    });
    return isValid;
}

function nextStep() {
    if (!validateCurrentStep()) {
        Swal.fire({
            icon: 'warning',
            title: 'Campos incompletos',
            text: 'Completa todos los campos obligatorios antes de continuar.',
            confirmButtonColor: '#003366',
            confirmButtonText: 'Entendido'
        });
        return;
    }
    if (currentStep < totalSteps) {
        currentStep++;
        updateWizardUI();
    }
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        updateWizardUI();
    }
}

function togglePwd(inputId, iconElement) {
    const pwdInput = document.getElementById(inputId);
    if (!pwdInput) return;
    if (pwdInput.type === 'password') {
        pwdInput.type = 'text';
        iconElement.classList.remove('fa-eye');
        iconElement.classList.add('fa-eye-slash');
    } else {
        pwdInput.type = 'password';
        iconElement.classList.remove('fa-eye-slash');
        iconElement.classList.add('fa-eye');
    }
}

async function enviarRegistro(event) {
    event.preventDefault();
    if (!validateCurrentStep()) return;

    const correo = document.getElementById('correo').value.trim().toLowerCase();

    const data = {
        correo: correo,
        password: document.getElementById('password').value,
        nombre: document.getElementById('nombre').value.trim(),
        primerApellido: document.getElementById('primerApellido').value.trim(),
        segundoApellido: document.getElementById('segundoApellido').value.trim() || null,
        curp: document.getElementById('curp').value.trim(),
        rfc: document.getElementById('rfc').value.trim() || null,
        fechaNacimiento: document.getElementById('fechaNacimiento').value,
        estadoCivil: document.getElementById('estadoCivil').value,
        telefono: document.getElementById('telefono').value.trim(),
        direccionPostal: document.getElementById('direccionPostal').value.trim() || null,
        direccion: document.getElementById('direccion').value.trim() || null,
        licenciatura: document.getElementById('licenciatura').value.trim(),
        institucionLicenciatura: document.getElementById('institucionLicenciatura').value.trim(),
        fechaEgreso: document.getElementById('fechaEgreso').value,
        fechaTitulacion: document.getElementById('fechaTitulacion').value,
        promedio: document.getElementById('promedio').value,
        otrosEstudios: document.getElementById('otrosEstudios').value.trim() || null,
        ocupacion: document.getElementById('ocupacion').value.trim() || null,
        ciudadOcupacion: document.getElementById('ciudadOcupacion').value.trim() || null,
        estadoOcupacion: document.getElementById('estadoOcupacion').value.trim() || null,
        telefonoOcupacion: document.getElementById('telefonoOcupacion').value.trim() || null
    };

    const btnSubmit = document.getElementById('btnSubmit');

    try {
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = 'Procesando... <i class="fa-solid fa-spinner fa-spin"></i>';
        }

        const respuesta = await fetch("/api/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const jsonResp = await respuesta.json();

        if (jsonResp.success) {
            await Swal.fire({
                icon: 'success',
                title: '¡Registro exitoso!',
                text: 'Tu cuenta fue creada. Ahora puedes iniciar sesión.',
                confirmButtonColor: '#003366',
                confirmButtonText: 'Ir al inicio de sesión'
            });
            window.location.href = `login.html?correo=${encodeURIComponent(correo)}`;
        } else {
            Swal.fire({
                icon: 'error',
                title: 'No se pudo completar el registro',
                text: jsonResp.mensaje || 'Ocurrió un error al procesar tu solicitud.',
                confirmButtonColor: '#003366',
                confirmButtonText: 'Intentar de nuevo'
            });
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = 'Registrarte';
            }
        }

    } catch (error) {
        console.error("Error en la petición:", error);
        Swal.fire({
            icon: 'error',
            title: 'Error de conexión',
            text: 'No fue posible conectar con el servidor. Revisa tu conexión e intenta de nuevo.',
            confirmButtonColor: '#003366',
            confirmButtonText: 'Cerrar'
        });
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = 'Registrarte';
        }
    }
}
