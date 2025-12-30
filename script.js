const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby1jH8whuVopByami6-iBlV35KFzRSwRlguvBTd3dQoonHgfqwgZubjEVGbSV4SI3M/exec';

let currentFilter = 'mensual'; // diario, semanal, mensual
let ingresoVsGastoChart, gastosPorCategoriaChart, evolucionPrestamosChart;

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupNavigation();
    setupHamburgerMenu();
    loadInitialData();
    setupForms();
    setupFilters();
    setDefaultDates();
});

function setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('gasto_fecha').value = today;
    document.getElementById('ingreso_fecha').value = today;
    document.getElementById('objetivo_fecha_inicio').value = today;
}

function setupNavigation() {
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    const sections = document.querySelectorAll('.main-content .content-section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-section');

            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            sections.forEach(section => {
                if (section.id === targetId) {
                    section.classList.add('active');
                    if (targetId === 'dashboard') {
                        handleLoadDashboard();
                    }
                } else {
                    section.classList.remove('active');
                }
            });

            // Cerrar menú en mobile después de seleccionar
            if (window.innerWidth <= 768) {
                const sidebarNav = document.getElementById('sidebarNav');
                sidebarNav.classList.remove('show');
            }
        });
    });
}

function setupHamburgerMenu() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sidebarNav = document.getElementById('sidebarNav');

    hamburgerBtn.addEventListener('click', () => {
        sidebarNav.classList.toggle('show');

        // Cambiar icono
        const icon = hamburgerBtn.querySelector('i');
        if (sidebarNav.classList.contains('show')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
        } else {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    });

    // Cerrar menú al hacer click fuera
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            const sidebar = document.querySelector('.sidebar');
            if (!sidebar.contains(e.target)) {
                sidebarNav.classList.remove('show');
                const icon = hamburgerBtn.querySelector('i');
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        }
    });
}

async function loadInitialData() {
    try {
        // Cargar categorías de gastos
        const categoriasResponse = await fetch(`${SCRIPT_URL}?action=getCategoriasGastos`);
        const categoriasData = await categoriasResponse.json();

        if (categoriasData.status === 'success') {
            populateCategoriasGastos(categoriasData.data);
        } else {
            populateCategoriasGastos([]);
        }

        // Cargar fuentes de ingreso
        const fuentesResponse = await fetch(`${SCRIPT_URL}?action=getFuentesIngreso`);
        const fuentesData = await fuentesResponse.json();

        if (fuentesData.status === 'success') {
            populateFuentesIngreso(fuentesData.data);
        } else {
            populateFuentesIngreso([]);
        }

        // Cargar objetivo activo
        loadObjetivoActivo();

        // Cargar préstamos (para llenar selects)
        loadPrestamos();

    } catch (error) {
        console.error('Error al cargar datos iniciales:', error);
        displayStatus('statusDashboard', 'error', 'Error de conexión al cargar datos iniciales.');
    }
}

function populateCategoriasGastos(categorias) {
    const selectGasto = document.getElementById('gasto_categoria');
    selectGasto.innerHTML = '';

    if (categorias.length === 0) {
        selectGasto.innerHTML = '<option value="" disabled selected>No hay categorías registradas</option>';
        document.getElementById('listaCategorias').innerHTML = '<li>No hay categorías.</li>';
        return;
    }

    selectGasto.innerHTML = '<option value="" disabled selected>Seleccione una categoría</option>';

    const listHtml = categorias.map(cat => {
        const nombre = cat.nombre || `(ID ${cat.id})`;
        const color = cat.color || '#007bff';
        selectGasto.innerHTML += `<option value="${nombre}">${nombre}</option>`;
        return `<li style="padding: 8px; border-left: 4px solid ${color}; margin-bottom: 5px; background: #f8f9fa;">
                    <strong>${nombre}</strong>
                    <span style="float: right; width: 20px; height: 20px; background: ${color}; border-radius: 3px; display: inline-block;"></span>
                </li>`;
    }).join('');

    document.getElementById('listaCategorias').innerHTML = listHtml;
}

function populateFuentesIngreso(fuentes) {
    const selectIngreso = document.getElementById('ingreso_fuente');
    selectIngreso.innerHTML = '';

    if (fuentes.length === 0) {
        selectIngreso.innerHTML = '<option value="" disabled selected>No hay fuentes registradas</option>';
        document.getElementById('listaFuentes').innerHTML = '<li>No hay fuentes.</li>';
        return;
    }

    selectIngreso.innerHTML = '<option value="" disabled selected>Seleccione una fuente</option>';

    const listHtml = fuentes.map(fuente => {
        const nombre = fuente.nombre || `(ID ${fuente.id})`;
        selectIngreso.innerHTML += `<option value="${nombre}">${nombre}</option>`;
        return `<li style="padding: 8px; margin-bottom: 5px; background: #f8f9fa; border-radius: 4px;">
                    <i class="fas fa-stream" style="color: var(--primary-color);"></i> ${nombre}
                </li>`;
    }).join('');

    document.getElementById('listaFuentes').innerHTML = listHtml;
}

function setupForms() {
    // Configuración
    document.getElementById('iniciarDBBtn').addEventListener('click', () => handleConfigAction('iniciar'));
    document.getElementById('resetDBBtn').addEventListener('click', () => {
        if (window.confirm("¡ADVERTENCIA! ¿Deseas RESETEAR TODA la base de datos? Esto es irreversible.")) {
            handleConfigAction('resetear');
        }
    });

    // Categorías y Fuentes
    document.getElementById('categoriaForm').addEventListener('submit', (e) => handleAgregarCategoria(e));
    document.getElementById('fuenteForm').addEventListener('submit', (e) => handleAgregarFuente(e));

    // Gastos e Ingresos
    document.getElementById('gastoForm').addEventListener('submit', (e) => handleRegistrarGasto(e));
    document.getElementById('ingresoForm').addEventListener('submit', (e) => handleRegistrarIngreso(e));

    // Préstamos
    document.getElementById('prestamoForm').addEventListener('submit', (e) => handleRegistrarPrestamo(e));

    // Objetivos
    document.getElementById('objetivoForm').addEventListener('submit', (e) => handleCrearObjetivo(e));

    // Botones de carga
    document.getElementById('cargarGastosBtn').addEventListener('click', loadGastos);
    document.getElementById('cargarIngresosBtn').addEventListener('click', loadIngresos);
    document.getElementById('actualizarDashboardBtn').addEventListener('click', handleLoadDashboard);

    // Login y Logout
    document.getElementById('loginForm').addEventListener('submit', (e) => handleLogin(e));
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        handleLogout();
    });
}

function setupFilters() {
    const filtroDiario = document.getElementById('filtroDiario');
    const filtroSemanal = document.getElementById('filtroSemanal');
    const filtroMensual = document.getElementById('filtroMensual');

    filtroDiario.addEventListener('click', () => {
        setActiveFilter('diario', filtroDiario);
        handleLoadDashboard();
    });

    filtroSemanal.addEventListener('click', () => {
        setActiveFilter('semanal', filtroSemanal);
        handleLoadDashboard();
    });

    filtroMensual.addEventListener('click', () => {
        setActiveFilter('mensual', filtroMensual);
        handleLoadDashboard();
    });
}

function setActiveFilter(filter, button) {
    currentFilter = filter;
    document.querySelectorAll('[id^="filtro"]').forEach(btn => btn.classList.remove('filtro-activo'));
    button.classList.add('filtro-activo');
}

// ================= DASHBOARD FUNCTIONS =================

async function handleLoadDashboard() {
    await calcularResumenFinanciero();
    await cargarDatosGraficos();
}

async function calcularResumenFinanciero() {
    displayStatus('statusDashboard', 'info', 'Calculando resumen financiero...');

    try {
        const response = await fetch(`${SCRIPT_URL}?action=getResumenFinanciero&periodo=${currentFilter}`);
        const data = await response.json();

        if (data.status === 'success') {
            const resumen = data.data;

            document.getElementById('totalIngresos').textContent = `$${resumen.totalIngresos.toFixed(2)}`;
            document.getElementById('totalGastos').textContent = `$${resumen.totalGastos.toFixed(2)}`;
            document.getElementById('balance').textContent = `$${resumen.balance.toFixed(2)}`;

            // Color del balance
            const balanceElement = document.getElementById('balance');
            if (resumen.balance > 0) {
                balanceElement.style.color = 'var(--secondary-color)';
            } else if (resumen.balance < 0) {
                balanceElement.style.color = 'var(--danger-color)';
            } else {
                balanceElement.style.color = '#666';
            }

            // Progreso del objetivo
            if (resumen.progresoObjetivo !== null) {
                document.getElementById('progresoObjetivo').textContent = `${resumen.progresoObjetivo.toFixed(1)}%`;
            } else {
                document.getElementById('progresoObjetivo').textContent = 'N/A';
            }

            // Totales de préstamos
            document.getElementById('totalCobrar').textContent = `$${(resumen.totalPorCobrar || 0).toFixed(2)}`;
            document.getElementById('totalPagar').textContent = `$${(resumen.totalPorPagar || 0).toFixed(2)}`;

            displayStatus('statusDashboard', 'success', `Resumen ${currentFilter} calculado exitosamente.`);
        } else {
            displayStatus('statusDashboard', 'warning', data.message || 'No hay datos disponibles.');
        }

    } catch (error) {
        displayStatus('statusDashboard', 'error', `Error al calcular resumen: ${error.message}`);
    }
}

async function cargarDatosGraficos() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getDatosGraficos&periodo=${currentFilter}`);
        const data = await response.json();

        if (data.status === 'success' && data.data) {
            renderCharts(data.data);
        } else {
            displayStatus('statusDashboard', 'warning', 'No hay datos suficientes para generar gráficos.');
        }

    } catch (error) {
        displayStatus('statusDashboard', 'error', `Error al cargar gráficos: ${error.message}`);
    }
}

function renderCharts(data) {
    // Gráfico 1: Ingresos vs Gastos
    const ctx1 = document.getElementById('ingresoVsGastoChart').getContext('2d');
    if (ingresoVsGastoChart) ingresoVsGastoChart.destroy();

    ingresoVsGastoChart = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: data.labels || [],
            datasets: [
                {
                    label: 'Ingresos',
                    data: data.ingresos || [],
                    backgroundColor: 'rgba(40, 167, 69, 0.7)',
                    borderColor: 'rgba(40, 167, 69, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Gastos',
                    data: data.gastos || [],
                    backgroundColor: 'rgba(220, 53, 69, 0.7)',
                    borderColor: 'rgba(220, 53, 69, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `Ingresos vs Gastos - ${currentFilter.charAt(0).toUpperCase() + currentFilter.slice(1)}`
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Monto ($)'
                    }
                }
            }
        }
    });

    // Gráfico 2: Gastos por Categoría
    const ctx2 = document.getElementById('gastosPorCategoriaChart').getContext('2d');
    if (gastosPorCategoriaChart) gastosPorCategoriaChart.destroy();

    gastosPorCategoriaChart = new Chart(ctx2, {
        type: 'doughnut',
        data: {
            labels: data.categorias || [],
            datasets: [{
                data: data.gastosPorCategoria || [],
                backgroundColor: data.colores || [
                    '#007bff', '#28a745', '#dc3545', '#ffc107',
                    '#17a2b8', '#6f42c1', '#fd7e14', '#20c997'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `Distribución de Gastos por Categoría - ${currentFilter.charAt(0).toUpperCase() + currentFilter.slice(1)}`
                },
                legend: {
                    position: 'right'
                }
            }
        }
    });

    // Gráfico 3: Evolución de Préstamos
    const ctx3 = document.getElementById('evolucionPrestamosChart').getContext('2d');
    if (evolucionPrestamosChart) evolucionPrestamosChart.destroy();

    fetch(`${SCRIPT_URL}?action=getPrestamos`)
        .then(res => res.json())
        .then(prestamosData => {
            if (prestamosData.status === 'success') {
                const totalCobrar = prestamosData.data.cobrar.reduce((sum, p) => sum + p.saldoActual, 0);
                const totalPagar = prestamosData.data.pagar.reduce((sum, p) => sum + p.saldoActual, 0);

                evolucionPrestamosChart = new Chart(ctx3, {
                    type: 'bar',
                    data: {
                        labels: ['Cuentas por Cobrar', 'Deudas por Pagar'],
                        datasets: [{
                            label: 'Saldo Actual',
                            data: [totalCobrar, totalPagar],
                            backgroundColor: ['rgba(40, 167, 69, 0.7)', 'rgba(220, 53, 69, 0.7)'],
                            borderColor: ['rgba(40, 167, 69, 1)', 'rgba(220, 53, 69, 1)'],
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Resumen de Cartera (Activos vs Pasivos)'
                            }
                        },
                        scales: { y: { beginAtZero: true } }
                    }
                });
            }
        });
}

// ================= GASTOS FUNCTIONS =================

async function handleRegistrarGasto(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const editId = form.dataset.editId;
    const isUpdate = !!editId;

    displayStatus('statusGasto', 'info', isUpdate ? 'Actualizando gasto...' : 'Registrando gasto...');

    const gastoData = {
        action: isUpdate ? 'actualizarGasto' : 'agregarGasto',
        categoria: document.getElementById('gasto_categoria').value,
        monto: document.getElementById('gasto_monto').value,
        descripcion: document.getElementById('gasto_descripcion').value,
        fecha: document.getElementById('gasto_fecha').value,
        prestamoId: document.getElementById('gasto_prestamo_id').value,
        tipoAbono: document.getElementById('gasto_tipo_abono').value
    };

    if (isUpdate) {
        gastoData.id = editId;
    }

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(gastoData),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const data = await response.json();

        if (data.status === 'success') {
            displayStatus('statusGasto', 'success', data.message);
            form.reset();
            setDefaultDates();
            delete form.dataset.editId;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Registrar Gasto';
            submitBtn.classList.remove('updating');
            loadGastos();
        } else {
            displayStatus('statusGasto', 'error', data.message);
        }
    } catch (error) {
        displayStatus('statusGasto', 'error', `Error de conexión: ${error.message}`);
    } finally {
        submitBtn.disabled = false;
    }
}

async function loadGastos() {
    displayStatus('statusGasto', 'info', 'Cargando gastos...');
    const tableBody = document.getElementById('gastosTableBody');
    tableBody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';

    try {
        const response = await fetch(`${SCRIPT_URL}?action=getGastos`);
        const data = await response.json();

        if (data.status === 'success' && data.data && data.data.length > 0) {
            displayStatus('statusGasto', 'success', `${data.data.length} gastos cargados.`);
            tableBody.innerHTML = data.data.map(g => `
                <tr>
                    <td>${g.fecha}</td>
                    <td>${g.categoria}</td>
                    <td>${g.descripcion}</td>
                    <td style="color: var(--danger-color); font-weight: bold;">$${parseFloat(g.monto).toFixed(2)}</td>
                    <td class="action-buttons">
                        <button class="btn-icon edit-btn" 
                                data-action="edit-gasto"
                                data-id="${g.id}" 
                                data-fecha="${g.fecha}" 
                                data-categoria="${g.categoria}" 
                                data-descripcion="${g.descripcion}" 
                                data-monto="${g.monto}" 
                                title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete-btn" 
                                data-action="delete-gasto"
                                data-id="${g.id}" 
                                title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');

            // Agregar event listeners después de crear el HTML
            setupGastoActionButtons();
        } else {
            displayStatus('statusGasto', 'warning', 'No hay gastos registrados.');
            tableBody.innerHTML = '<tr><td colspan="5">No hay gastos registrados.</td></tr>';
        }
    } catch (error) {
        displayStatus('statusGasto', 'error', `Error al cargar gastos: ${error.message}`);
        tableBody.innerHTML = '<tr><td colspan="5">Error al cargar datos.</td></tr>';
    }
}

function setupGastoActionButtons() {
    const tableBody = document.getElementById('gastosTableBody');

    tableBody.addEventListener('click', (e) => {
        const button = e.target.closest('button[data-action]');
        if (!button) return;

        const action = button.dataset.action;
        const id = button.dataset.id;

        if (action === 'edit-gasto') {
            const fecha = button.dataset.fecha;
            const categoria = button.dataset.categoria;
            const descripcion = button.dataset.descripcion;
            const monto = button.dataset.monto;
            editarGasto(id, fecha, categoria, descripcion, monto);
        } else if (action === 'delete-gasto') {
            eliminarGasto(id);
        }
    });
}

async function editarGasto(id, fecha, categoria, descripcion, monto) {
    // Llenar el formulario con los datos existentes
    document.getElementById('gasto_categoria').value = categoria;
    document.getElementById('gasto_monto').value = monto;
    document.getElementById('gasto_descripcion').value = descripcion;
    document.getElementById('gasto_fecha').value = fecha;

    // Guardar el ID para actualizar
    document.getElementById('gastoForm').dataset.editId = id;

    // Cambiar el texto del botón
    const submitBtn = document.querySelector('#gastoForm button[type="submit"]');
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Actualizar Gasto';
    submitBtn.classList.add('updating');

    // Scroll al formulario
    document.getElementById('gastos').scrollIntoView({ behavior: 'smooth', block: 'start' });

    displayStatus('statusGasto', 'info', 'Editando gasto. Modifica los campos y guarda.');
}

async function eliminarGasto(id) {
    if (!confirm('¿Estás seguro de eliminar este gasto? Esta acción no se puede deshacer.')) {
        return;
    }

    console.log('=== ELIMINAR GASTO ===');
    console.log('ID a eliminar:', id);

    displayStatus('statusGasto', 'info', 'Eliminando gasto...');

    const requestData = {
        action: 'eliminarGasto',
        id: id
    };

    console.log('Datos a enviar:', requestData);

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(requestData),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });

        console.log('Response status:', response.status);
        console.log('Response OK:', response.ok);

        const data = await response.json();
        console.log('Respuesta del servidor:', data);

        if (data.status === 'success') {
            displayStatus('statusGasto', 'success', data.message);
            loadGastos();
        } else {
            displayStatus('statusGasto', 'error', data.message);
            console.error('Error del servidor:', data.message);
        }
    } catch (error) {
        console.error('Error en la petición:', error);
        displayStatus('statusGasto', 'error', `Error al eliminar: ${error.message}`);
    }
}

// ================= INGRESOS FUNCTIONS =================

async function handleRegistrarIngreso(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const editId = form.dataset.editId;
    const isUpdate = !!editId;

    displayStatus('statusIngreso', 'info', isUpdate ? 'Actualizando ingreso...' : 'Registrando ingreso...');

    const ingresoData = {
        action: isUpdate ? 'actualizarIngreso' : 'agregarIngreso',
        fuente: document.getElementById('ingreso_fuente').value,
        monto: document.getElementById('ingreso_monto').value,
        descripcion: document.getElementById('ingreso_descripcion').value,
        fecha: document.getElementById('ingreso_fecha').value,
        prestamoId: document.getElementById('ingreso_prestamo_id').value,
        tipoAbono: document.getElementById('ingreso_tipo_abono').value
    };

    if (isUpdate) {
        ingresoData.id = editId;
    }

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(ingresoData),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const data = await response.json();

        if (data.status === 'success') {
            displayStatus('statusIngreso', 'success', data.message);
            form.reset();
            setDefaultDates();
            delete form.dataset.editId;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Registrar Ingreso';
            submitBtn.classList.remove('updating');
            loadIngresos();
        } else {
            displayStatus('statusIngreso', 'error', data.message);
        }
    } catch (error) {
        displayStatus('statusIngreso', 'error', `Error de conexión: ${error.message}`);
    } finally {
        submitBtn.disabled = false;
    }
}

async function loadIngresos() {
    displayStatus('statusIngreso', 'info', 'Cargando ingresos...');
    const tableBody = document.getElementById('ingresosTableBody');
    tableBody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';

    try {
        const response = await fetch(`${SCRIPT_URL}?action=getIngresos`);
        const data = await response.json();

        if (data.status === 'success' && data.data && data.data.length > 0) {
            displayStatus('statusIngreso', 'success', `${data.data.length} ingresos cargados.`);
            tableBody.innerHTML = data.data.map(i => `
                <tr>
                    <td>${i.fecha}</td>
                    <td>${i.fuente}</td>
                    <td>${i.descripcion}</td>
                    <td style="color: var(--secondary-color); font-weight: bold;">$${parseFloat(i.monto).toFixed(2)}</td>
                    <td class="action-buttons">
                        <button class="btn-icon edit-btn" 
                                data-action="edit-ingreso"
                                data-id="${i.id}" 
                                data-fecha="${i.fecha}" 
                                data-fuente="${i.fuente}" 
                                data-descripcion="${i.descripcion}" 
                                data-monto="${i.monto}" 
                                title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete-btn" 
                                data-action="delete-ingreso"
                                data-id="${i.id}" 
                                title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');

            // Agregar event listeners después de crear el HTML
            setupIngresoActionButtons();
        } else {
            displayStatus('statusIngreso', 'warning', 'No hay ingresos registrados.');
            tableBody.innerHTML = '<tr><td colspan="5">No hay ingresos registrados.</td></tr>';
        }
    } catch (error) {
        displayStatus('statusIngreso', 'error', `Error al cargar ingresos: ${error.message}`);
        tableBody.innerHTML = '<tr><td colspan="5">Error al cargar datos.</td></tr>';
    }
}

function setupIngresoActionButtons() {
    const tableBody = document.getElementById('ingresosTableBody');

    tableBody.addEventListener('click', (e) => {
        const button = e.target.closest('button[data-action]');
        if (!button) return;

        const action = button.dataset.action;
        const id = button.dataset.id;

        if (action === 'edit-ingreso') {
            const fecha = button.dataset.fecha;
            const fuente = button.dataset.fuente;
            const descripcion = button.dataset.descripcion;
            const monto = button.dataset.monto;
            editarIngreso(id, fecha, fuente, descripcion, monto);
        } else if (action === 'delete-ingreso') {
            eliminarIngreso(id);
        }
    });
}

async function editarIngreso(id, fecha, fuente, descripcion, monto) {
    // Llenar el formulario con los datos existentes
    document.getElementById('ingreso_fuente').value = fuente;
    document.getElementById('ingreso_monto').value = monto;
    document.getElementById('ingreso_descripcion').value = descripcion;
    document.getElementById('ingreso_fecha').value = fecha;

    // Guardar el ID para actualizar
    document.getElementById('ingresoForm').dataset.editId = id;

    // Cambiar el texto del botón
    const submitBtn = document.querySelector('#ingresoForm button[type="submit"]');
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Actualizar Ingreso';
    submitBtn.classList.add('updating');

    // Scroll al formulario
    document.getElementById('ingresos').scrollIntoView({ behavior: 'smooth', block: 'start' });

    displayStatus('statusIngreso', 'info', 'Editando ingreso. Modifica los campos y guarda.');
}

async function eliminarIngreso(id) {
    if (!confirm('¿Estás seguro de eliminar este ingreso? Esta acción no se puede deshacer.')) {
        return;
    }

    console.log('=== ELIMINAR INGRESO ===');
    console.log('ID a eliminar:', id);

    displayStatus('statusIngreso', 'info', 'Eliminando ingreso...');

    const requestData = {
        action: 'eliminarIngreso',
        id: id
    };

    console.log('Datos a enviar:', requestData);

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(requestData),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });

        console.log('Response status:', response.status);
        console.log('Response OK:', response.ok);

        const data = await response.json();
        console.log('Respuesta del servidor:', data);

        if (data.status === 'success') {
            displayStatus('statusIngreso', 'success', data.message);
            loadIngresos();
        } else {
            displayStatus('statusIngreso', 'error', data.message);
            console.error('Error del servidor:', data.message);
        }
    } catch (error) {
        console.error('Error en la petición:', error);
        displayStatus('statusIngreso', 'error', `Error al eliminar: ${error.message}`);
    }
}

// ================= OBJETIVOS FUNCTIONS =================

async function handleCrearObjetivo(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    displayStatus('statusObjetivo', 'info', 'Creando objetivo...');

    const objetivoData = {
        action: 'crearObjetivo',
        nombre: document.getElementById('objetivo_nombre').value,
        monto: document.getElementById('objetivo_monto').value,
        plazo: document.getElementById('objetivo_plazo').value,
        fecha_inicio: document.getElementById('objetivo_fecha_inicio').value
    };

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(objetivoData),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const data = await response.json();

        if (data.status === 'success') {
            displayStatus('statusObjetivo', 'success', data.message);
            form.reset();
            setDefaultDates();
            loadObjetivoActivo();
        } else {
            displayStatus('statusObjetivo', 'error', data.message);
        }
    } catch (error) {
        displayStatus('statusObjetivo', 'error', `Error de conexión: ${error.message}`);
    } finally {
        submitBtn.disabled = false;
    }
}

async function loadObjetivoActivo() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getObjetivoActivo`);
        const data = await response.json();

        const container = document.getElementById('objetivoActualContainer');

        if (data.status === 'success' && data.data) {
            const obj = data.data;
            const progreso = obj.progreso || 0;
            const ahorroActual = obj.ahorroActual || 0;

            container.innerHTML = `
                <h4 style="margin-top: 0; color: var(--primary-color);">
                    <i class="fas fa-bullseye"></i> ${obj.nombre}
                </h4>
                <div style="margin: 15px 0;">
                    <div style="background: #e9ecef; border-radius: 10px; height: 30px; overflow: hidden;">
                        <div style="background: linear-gradient(90deg, var(--secondary-color), var(--primary-color)); 
                                    height: 100%; width: ${Math.min(progreso, 100)}%; 
                                    display: flex; align-items: center; justify-content: center; 
                                    color: white; font-weight: bold; transition: width 0.3s;">
                            ${progreso.toFixed(1)}%
                        </div>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
                    <div>
                        <p style="margin: 5px 0; color: #666;">Meta:</p>
                        <p style="margin: 5px 0; font-size: 1.2em; font-weight: bold;">$${parseFloat(obj.monto_meta).toFixed(2)}</p>
                    </div>
                    <div>
                        <p style="margin: 5px 0; color: #666;">Ahorro Actual:</p>
                        <p style="margin: 5px 0; font-size: 1.2em; font-weight: bold; color: var(--secondary-color);">$${ahorroActual.toFixed(2)}</p>
                    </div>
                    <div>
                        <p style="margin: 5px 0; color: #666;">Plazo:</p>
                        <p style="margin: 5px 0; font-weight: bold;">${obj.plazo_meses} meses</p>
                    </div>
                    <div>
                        <p style="margin: 5px 0; color: #666;">Fecha Inicio:</p>
                        <p style="margin: 5px 0; font-weight: bold;">${obj.fecha_inicio}</p>
                    </div>
                </div>
                <p style="margin-top: 15px; padding: 10px; background: #e7f3ff; border-radius: 5px; color: #004085;">
                    <i class="fas fa-info-circle"></i> ${obj.mensaje || 'Sigue ahorrando para alcanzar tu meta!'}
                </p>
            `;
        } else {
            container.innerHTML = '<p style="text-align: center; color: #666;">No hay objetivo activo. Crea uno arriba.</p>';
        }
    } catch (error) {
        console.error('Error al cargar objetivo:', error);
    }
}

// ================= CATEGORÍAS Y FUENTES =================

async function handleAgregarCategoria(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    displayStatus('statusCategoria', 'info', 'Agregando categoría...');

    const categoriaData = {
        action: 'agregarCategoriaGasto',
        nombre: document.getElementById('cat_nombre').value,
        color: document.getElementById('cat_color').value
    };

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(categoriaData),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const data = await response.json();

        if (data.status === 'success') {
            displayStatus('statusCategoria', 'success', data.message);
            form.reset();
            document.getElementById('cat_color').value = '#007bff';
            loadInitialData();
        } else {
            displayStatus('statusCategoria', 'error', data.message);
        }
    } catch (error) {
        displayStatus('statusCategoria', 'error', `Error de conexión: ${error.message}`);
    } finally {
        submitBtn.disabled = false;
    }
}

async function handleAgregarFuente(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    displayStatus('statusFuente', 'info', 'Agregando fuente...');

    const fuenteData = {
        action: 'agregarFuenteIngreso',
        nombre: document.getElementById('fuente_nombre').value
    };

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(fuenteData),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const data = await response.json();

        if (data.status === 'success') {
            displayStatus('statusFuente', 'success', data.message);
            form.reset();
            loadInitialData();
        } else {
            displayStatus('statusFuente', 'error', data.message);
        }
    } catch (error) {
        displayStatus('statusFuente', 'error', `Error de conexión: ${error.message}`);
    } finally {
        submitBtn.disabled = false;
    }
}

// ================= CONFIGURACIÓN =================

async function handleConfigAction(action) {
    setButtonState(true);
    displayStatus('statusConfig', 'info', `Procesando la acción de ${action}...`);

    try {
        const response = await fetch(`${SCRIPT_URL}?action=${action}`);
        const data = await response.json();

        if (data.status === 'success') {
            displayStatus('statusConfig', 'success', data.message);
            loadInitialData();
        } else {
            displayStatus('statusConfig', 'error', data.message);
        }
    } catch (error) {
        displayStatus('statusConfig', 'error', `Error de conexión: ${error.message}.`);
    } finally {
        setButtonState(false);
    }
}

function setButtonState(disabled) {
    document.getElementById('iniciarDBBtn').disabled = disabled;
    document.getElementById('resetDBBtn').disabled = disabled;
}

// ================= PRESTAMOS FUNCTIONS =================

async function handleRegistrarPrestamo(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    displayStatus('statusPrestamo', 'info', 'Registrando préstamo y movimiento automático...');

    const prestamoData = {
        action: 'agregarPrestamo',
        tipo: document.getElementById('prestamo_tipo').value,
        contraparte: document.getElementById('prestamo_contraparte').value,
        montoInicial: document.getElementById('prestamo_monto').value,
        tasaInteres: document.getElementById('prestamo_tasa').value,
        plazo: document.getElementById('prestamo_plazo').value,
        fechaInicio: document.getElementById('prestamo_fecha').value,
        notas: document.getElementById('prestamo_notas').value
    };

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(prestamoData),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });

        const rawText = await response.text();
        console.log('--- RESPUESTA GAS ---');
        console.log('Raw:', rawText);

        let data;
        try {
            data = JSON.parse(rawText);
        } catch (e) {
            console.error('Error al parsear JSON:', e);
            displayStatus('statusPrestamo', 'error', 'El servidor devolvió una respuesta inválida.');
            return;
        }

        console.log('Data:', data);

        if (data.status === 'success') {
            displayStatus('statusPrestamo', 'success', data.message || 'Operación exitosa.');
            form.reset();
            setDefaultDates();
            loadPrestamos();
            handleLoadDashboard();
        } else {
            displayStatus('statusPrestamo', 'error', data.message || 'Ocurrió un error en el servidor.');
        }
    } catch (error) {
        console.error('Error en fetch:', error);
        displayStatus('statusPrestamo', 'error', `Error de conexión: ${error.message}`);
    } finally {
        submitBtn.disabled = false;
    }
}

async function loadPrestamos() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getPrestamos`);
        const data = await response.json();

        if (data.status === 'success') {
            renderPrestamosTables(data.data);
            populatePrestamosSelects(data.data);
        }
    } catch (error) {
        console.error('Error al cargar préstamos:', error);
    }
}

function renderPrestamosTables(data) {
    const cobrarTable = document.getElementById('cobrarTableBody');
    const pagarTable = document.getElementById('pagarTableBody');

    // Cuentas por Cobrar
    if (data.cobrar.length === 0) {
        cobrarTable.innerHTML = '<tr><td colspan="7">No hay cuentas por cobrar.</td></tr>';
    } else {
        cobrarTable.innerHTML = data.cobrar.map(p => `
            <tr>
                <td>${p.fechaInicio}</td>
                <td>${p.contraparte}</td>
                <td>$${p.montoInicial.toFixed(2)}</td>
                <td style="font-weight:bold; color: var(--secondary-color);">$${p.saldoActual.toFixed(2)}</td>
                <td>$${(p.cuotaMensual || 0).toFixed(2)}</td>
                <td>${p.tasa}%</td>
                <td><span class="status-pill ${p.estado.toLowerCase()}">${p.estado}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon edit-btn" title="Registrar Pago" onclick="prellenarPagoCuota(${p.id}, ${p.cuotaMensual}, 'INGRESO')">
                            <i class="fas fa-hand-holding-usd"></i>
                        </button>
                        <button class="btn-icon delete-btn" data-id="${p.id}" onclick="eliminarPrestamo(${p.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Deudas por Pagar
    if (data.pagar.length === 0) {
        pagarTable.innerHTML = '<tr><td colspan="7">No hay deudas por pagar.</td></tr>';
    } else {
        pagarTable.innerHTML = data.pagar.map(p => `
            <tr>
                <td>${p.fechaInicio}</td>
                <td>${p.contraparte}</td>
                <td>$${p.montoInicial.toFixed(2)}</td>
                <td style="font-weight:bold; color: var(--danger-color);">$${p.saldoActual.toFixed(2)}</td>
                <td>$${(p.cuotaMensual || 0).toFixed(2)}</td>
                <td>${p.tasa}%</td>
                <td><span class="status-pill ${p.estado.toLowerCase()}">${p.estado}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon edit-btn" title="Pagar Cuota" onclick="prellenarPagoCuota(${p.id}, ${p.cuotaMensual}, 'GASTO')">
                            <i class="fas fa-money-bill-wave"></i>
                        </button>
                        <button class="btn-icon delete-btn" data-id="${p.id}" onclick="eliminarPrestamo(${p.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
}

function populatePrestamosSelects(prestamos) {
    const selects = [
        document.getElementById('gasto_prestamo_id'),
        document.getElementById('ingreso_prestamo_id')
    ];

    const allPrestamos = [...prestamos.cobrar, ...prestamos.pagar].filter(p => p.estado === 'Activo');

    selects.forEach(select => {
        if (!select) return;
        const currentValue = select.value;
        select.innerHTML = '<option value="">Ninguno</option>';
        allPrestamos.forEach(p => {
            const label = `${p.tipo === 'PRESTADO' ? 'Cobro' : 'Pago'}: ${p.contraparte} (Bal: $${p.saldoActual.toFixed(2)})`;
            select.innerHTML += `<option value="${p.id}">${label}</option>`;
        });
        select.value = currentValue;
    });
}

async function eliminarPrestamo(id) {
    if (!confirm('¿Seguro que deseas eliminar este préstamo?')) return;

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'eliminarPrestamo', id: id }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const data = await response.json();
        if (data.status === 'success') {
            loadPrestamos();
            handleLoadDashboard();
        }
    } catch (error) {
        console.error('Error al eliminar:', error);
    }
}

function prellenarPagoCuota(id, monto, tipo) {
    const section = tipo === 'GASTO' ? 'gastos' : 'ingresos';
    const link = document.querySelector(`.sidebar-nav a[href="#${section}"]`);
    if (link) link.click();

    setTimeout(() => {
        if (tipo === 'GASTO') {
            document.getElementById('gasto_monto').value = monto.toFixed(2);
            document.getElementById('gasto_descripcion').value = `Pago de cuota mensual - ID Préstamo: ${id}`;
            document.getElementById('gasto_prestamo_id').value = id;
            document.getElementById('gasto_tipo_abono').value = 'CAPITAL';
            document.getElementById('gasto_categoria').value = 'Deuda';
        } else {
            document.getElementById('ingreso_monto').value = monto.toFixed(2);
            document.getElementById('ingreso_descripcion').value = `Cobro de cuota mensual - ID Préstamo: ${id}`;
            document.getElementById('ingreso_prestamo_id').value = id;
            document.getElementById('ingreso_tipo_abono').value = 'CAPITAL';
            document.getElementById('ingreso_fuente').value = 'Otros'; // O una fuente por defecto
        }

        // Hacer scroll al formulario
        const formId = tipo === 'GASTO' ? 'gastoForm' : 'ingresoForm';
        document.getElementById(formId).scrollIntoView({ behavior: 'smooth' });

        // Feedback visual
        displayStatus(tipo === 'GASTO' ? 'statusGasto' : 'statusIngreso', 'info', 'Datos de cuota prellenados. Revisa y presiona Guardar.');
    }, 100);
}

// ================= UTILITY FUNCTIONS =================

function displayStatus(elementId, type, message) {
    const el = document.getElementById(elementId);
    if (!el) return;

    el.style.display = 'block';
    el.className = `status-message ${type}`;

    const iconMap = {
        'success': 'check',
        'error': 'times',
        'warning': 'exclamation-triangle',
        'info': 'info'
    };

    const icon = iconMap[type] || 'info';
    const text = message || (type === 'error' ? 'Error desconocido' : '');

    el.innerHTML = `<i class="fas fa-${icon}-circle"></i> ${text}`;
    console.log(`[STATUS] ${elementId} (${type}): ${text}`);
}

// ================= AUTH FUNCTIONS =================

const AUTH_CONFIG = {
    user: 'admin',
    pass: '1234'
};

function checkAuth() {
    const isLoggedIn = localStorage.getItem('finanzas_logged_in');
    const overlay = document.getElementById('loginOverlay');

    if (isLoggedIn === 'true') {
        overlay.classList.add('hidden');
    } else {
        overlay.classList.remove('hidden');
    }
}

function handleLogin(e) {
    e.preventDefault();
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const errorEl = document.getElementById('loginError');

    if (user === AUTH_CONFIG.user && pass === AUTH_CONFIG.pass) {
        localStorage.setItem('finanzas_logged_in', 'true');
        document.getElementById('loginOverlay').classList.add('hidden');
        errorEl.style.display = 'none';
        console.log('Login exitoso');
        handleLoadDashboard(); // Cargar datos al entrar
    } else {
        errorEl.style.display = 'block';
        errorEl.textContent = 'Usuario o contraseña incorrectos.';
        // Shake effect opcional
        const box = document.querySelector('.login-box');
        box.style.animation = 'none';
        setTimeout(() => box.style.animation = 'shake 0.4s', 10);
    }
}

function handleLogout() {
    if (confirm('¿Deseas cerrar la sesión activa?')) {
        localStorage.removeItem('finanzas_logged_in');
        location.reload(); // Reiniciar app al salir
    }
}

// Agregar animación de shake al CSS dinámicamente o podrías ponerlo en estilo.css
const style = document.createElement('style');
style.innerHTML = `
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-10px); }
    75% { transform: translateX(10px); }
}
`;
document.head.appendChild(style);