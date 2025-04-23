document.addEventListener('DOMContentLoaded', () => {
    const numLayersInput = document.getElementById('num-layers');
    const layerConfigsContainer = document.getElementById('layer-configs');
    const generatedCodeElement = document.getElementById('generated-code');
    const layerCountDisplay = document.getElementById('layer-count');

    if (!numLayersInput || !layerConfigsContainer) {
        console.error('Required elements are missing in the HTML.');
        return;
    }

    const csrfToken = document.querySelector('meta[name="csrf-token"]').content;

    numLayersInput.addEventListener('input', () => {
        const numLayers = parseInt(numLayersInput.value) || 0;
        
        if (layerCountDisplay) {
            layerCountDisplay.textContent = `Number of Layers: ${numLayers}`;
        }

        layerConfigsContainer.innerHTML = '';
        layerConfigsContainer.style.display = 'block';

        for (let i = 0; i < numLayers; i++) {
            const layerDiv = document.createElement('div');
            layerDiv.classList.add('layer-config');

            const denseLabel = document.createElement('label');
            denseLabel.textContent = `Dense (Layer ${i + 1}):`;
            denseLabel.classList.add('dense-label');

            const denseInput = document.createElement('input');
            denseInput.type = 'number';
            denseInput.min = '1';
            denseInput.value = `128`;
            denseInput.placeholder = 'Units';
            denseInput.classList.add('dense-input');

            const activationSelect = document.createElement('select');
            activationSelect.classList.add('activation-select');
            const activations = ['relu', 'sigmoid', 'softmax', 'tanh'];
            activations.forEach(activation => {
                const option = document.createElement('option');
                option.value = activation;
                option.textContent = activation;
                activationSelect.appendChild(option);
            });

            const batchNormLabel = document.createElement('label');
            batchNormLabel.textContent = 'Batch normalization';
            batchNormLabel.classList.add('batch-norm-label');

            const batchNormCheckbox = document.createElement('input');
            batchNormCheckbox.type = 'checkbox';
            batchNormCheckbox.classList.add('batch-norm-checkbox');

            const dropoutLabel = document.createElement('label');
            dropoutLabel.textContent = `Dropout (Layer ${i + 1}):`;
            dropoutLabel.classList.add('dropout-label');

            const dropoutInput = document.createElement('input');
            dropoutInput.type = 'number';
            dropoutInput.step = '0.1';
            dropoutInput.min = '0';
            dropoutInput.max = '1';
            dropoutInput.value = `0`;
            dropoutInput.placeholder = 'Rate';
            dropoutInput.classList.add('dropout-input');

            denseInput.addEventListener('input', () => {
                sendLayerUpdate(i + 1, denseInput.value, activationSelect.value, 
                    batchNormCheckbox.checked, dropoutInput.value, numLayers);
            });

            activationSelect.addEventListener('change', () => {
                sendLayerUpdate(i + 1, denseInput.value, activationSelect.value, 
                    batchNormCheckbox.checked, dropoutInput.value, numLayers);
            });

            batchNormCheckbox.addEventListener('change', () => {
                sendLayerUpdate(i + 1, denseInput.value, activationSelect.value, 
                    batchNormCheckbox.checked, dropoutInput.value, numLayers);
            });

            dropoutInput.addEventListener('input', () => {
                sendLayerUpdate(i + 1, denseInput.value, activationSelect.value, 
                    batchNormCheckbox.checked, dropoutInput.value, numLayers);
            });

            layerDiv.appendChild(denseLabel);
            layerDiv.appendChild(denseInput);
            layerDiv.appendChild(activationSelect);
            layerDiv.appendChild(batchNormLabel);
            layerDiv.appendChild(batchNormCheckbox);
            layerDiv.appendChild(dropoutLabel);
            layerDiv.appendChild(dropoutInput);

            layerConfigsContainer.appendChild(layerDiv);
        }

        initialUpdate(numLayers);
    });


    function initialUpdate(layers) {
        const loadingIndicator = createLoadingIndicator();
        document.body.appendChild(loadingIndicator);

        fetch('/initial-update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({
                maxLayer: layers
            }),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'success' && generatedCodeElement) {
                generatedCodeElement.textContent = data.code.join('\n');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert(`Failed to update layer configuration: ${error.message}`);
        })
        .finally(() => {
            loadingIndicator.remove();
        });
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    const debouncedSendLayerUpdate = debounce(sendLayerUpdate, 100);

    function validateInputs(units, dropoutRate, layers) {
        if(layers <= 0) {
            alert('Number of layers must be greater than 0');
            return false;
        }
        if (units <= 0) {
            alert('Units must be greater than 0');
            return false;
        }
        if (dropoutRate < 0 || dropoutRate > 1) {
            alert('Dropout rate must be between 0 and 1');
            return false;
        }
        return true;
    }

    function sendLayerUpdate(layerIndex, units, activation, batchNormalization, dropoutRate, layers) {
        if (!validateInputs(units, dropoutRate, layers)) {
            return;
        }
        const loadingIndicator = createLoadingIndicator();
        document.body.appendChild(loadingIndicator);

        fetch('/update-layer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({
                maxLayer: layers,
                layer: layerIndex,
                units: units,
                activation: activation,
                batchNormalization: batchNormalization,
                dropoutRate: dropoutRate,
            }),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'success' && generatedCodeElement) {
                generatedCodeElement.textContent = data.code.join('\n');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to update layer configuration');
        })
        .finally(() => {
            loadingIndicator.remove();
        });
    }

    const submitButton = document.getElementById('submit-button');
    if (submitButton) {
        submitButton.addEventListener('click', () => {
            fetch('/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.status === 'success') {
                    alert('Model submitted successfully!');
                } else {
                    throw new Error(data.message || 'Failed to submit model');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert(`Failed to submit model: ${error.message}`);
            });
        });
    }

    const menuButton = document.getElementById('menu-button');
    const sideMenu = document.getElementById('side-menu');

    menuButton.addEventListener('click', () => {
        if (sideMenu.classList.contains('open')) {
            sideMenu.classList.remove('open');
            menuButton.textContent = 'Open Menu';
        } else {
            sideMenu.classList.add('open');
            menuButton.textContent = 'Close Menu';
        }
    });
});

function createLoadingIndicator() {
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.textContent = 'Updating...';
    return loadingIndicator;
}