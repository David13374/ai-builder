document.addEventListener('DOMContentLoaded', () => {
    const numLayersInput = document.getElementById('num-layers');
    const layerConfigsContainer = document.getElementById('layer-configs');
    const generatedCodeElement = document.getElementById('generated-code');
    const layerCountDisplay = document.getElementById('layer-count');

    if (!numLayersInput || !layerConfigsContainer) {
        console.error('Required elements are missing in the HTML.');
        return;
    }

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
            dropoutInput.min = '0';
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

            sendLayerUpdate(i + 1, denseInput.value, activationSelect.value, 
                batchNormCheckbox.checked, dropoutInput.value, numLayers);
        }
    });

    function sendLayerUpdate(layerIndex, units, activation, batchNormalization, dropoutRate, layers) {
        fetch('/update-layer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
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
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                const updatedCode = data.code;
                console.log(`Updated Code:\n${updatedCode.join('\n')}`);
                generatedCodeElement.textContent = updatedCode.join('\n');
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }

    const submitButton = document.getElementById('submit-button');

    submitButton.addEventListener('click', () => {
        console.log('Submit button clicked!');
        fetch('/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: 'Model submitted!' }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                alert('Model submitted successfully!');
            } else {
                alert(`Failed to submit model. Error: ${data.message}`);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    });

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