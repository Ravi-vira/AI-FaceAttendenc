const URL = "https://teachablemachine.withgoogle.com/models/OcUt27Mag/";
let model, webcam, labelContainer, maxPredictions;

// Show notification function
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const messageElement = notification.querySelector('.notification-message');
    
    notification.className = `notification ${type}`;
    messageElement.textContent = message;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Initialize the system
async function init() {
    try {
        const modelURL = URL + "model.json";
        const metadataURL = URL + "metadata.json";

        // Show loading state
        document.querySelector('.camera-section').style.opacity = '0.7';
        showNotification('Loading model...', 'info');

        // Load the model and metadata
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();

        // Setup webcam
        const flip = true;
        webcam = new tmImage.Webcam(400, 400, flip);
        
        try {
            await webcam.setup();
            await webcam.play();
            showNotification('Camera initialized successfully');
        } catch (error) {
            showNotification('Failed to access camera. Please check permissions.', 'error');
            return;
        }

        // Remove loading state
        document.querySelector('.camera-section').style.opacity = '1';
        
        // Start prediction loop
        window.requestAnimationFrame(loop);

        // Append webcam element
        document.getElementById("webcam-container").appendChild(webcam.canvas);
        
        // Setup label container
        labelContainer = document.getElementById("label-container");
        for (let i = 0; i < maxPredictions; i++) {
            labelContainer.appendChild(document.createElement("div"));
        }

    } catch (error) {
        showNotification('Failed to initialize the system. Please try again.', 'error');
        console.error(error);
    }
}

async function loop() {
    webcam.update();
    await predict();
    window.requestAnimationFrame(loop);
}

async function predict() {
    const prediction = await model.predict(webcam.canvas);
    for (let i = 0; i < maxPredictions; i++) {
        const probability = prediction[i].probability * 100;
        const classPrediction = `${prediction[i].className}: ${probability.toFixed(2)}%`;
        const element = labelContainer.childNodes[i];
        element.innerHTML = classPrediction;
        
        // Add confidence-based styling
        if (probability > 80) {
            element.style.borderLeft = '4px solid #4caf50';
        } else if (probability > 50) {
            element.style.borderLeft = '4px solid #ff9800';
        } else {
            element.style.borderLeft = '4px solid #f44336';
        }
    }
}

function markAttendance() {
    const button = document.getElementById('markAttendance');
    button.classList.add('loading');

    setTimeout(() => {
        const predictions = Array.from(labelContainer.childNodes).map(node => node.innerHTML);
        const highestPrediction = predictions.reduce((max, prediction) => {
            const [, probabilityStr] = prediction.split(": ");
            const probability = parseFloat(probabilityStr);
            return probability > parseFloat(max.split(": ")[1]) ? prediction : max;
        });

        const [name, probabilityStr] = highestPrediction.split(": ");
        const probability = parseFloat(probabilityStr);

        if (probability > 80) {
            const timestamp = new Date().toLocaleString();
            const attendanceList = document.getElementById('attendanceList');
            const attendanceRecord = document.createElement('div');
            attendanceRecord.innerHTML = `
                <span><i class="fas fa-user"></i> ${name}</span>
                <span><i class="fas fa-clock"></i> ${timestamp}</span>
            `;
            attendanceList.insertBefore(attendanceRecord, attendanceList.firstChild);
            
            // Save to localStorage
            const attendance = JSON.parse(localStorage.getItem('attendance') || '[]');
            attendance.push({ name, timestamp });
            localStorage.setItem('attendance', JSON.stringify(attendance));
            
            showNotification(`Attendance marked for ${name}`);
        } else {
            showNotification('No person recognized with high confidence. Please try again.', 'error');
        }

        button.classList.remove('loading');
    }, 1000); // Simulate processing time
}

// Search functionality
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const records = document.querySelectorAll('#attendanceList div');
        
        records.forEach(record => {
            const text = record.textContent.toLowerCase();
            record.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    });
}

// Initialize the system
init();

// Add event listeners
document.getElementById('markAttendance').addEventListener('click', markAttendance);
window.addEventListener('load', () => {
    setupSearch();
    
    // Load previous attendance records
    const attendance = JSON.parse(localStorage.getItem('attendance') || '[]');
    const attendanceList = document.getElementById('attendanceList');
    
    attendance.forEach(record => {
        const attendanceRecord = document.createElement('div');
        attendanceRecord.innerHTML = `
            <span><i class="fas fa-user"></i> ${record.name}</span>
            <span><i class="fas fa-clock"></i> ${record.timestamp}</span>
        `;
        attendanceList.appendChild(attendanceRecord);
    });
});