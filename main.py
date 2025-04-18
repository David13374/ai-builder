from flask import Flask, render_template, request, jsonify
import os

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/keras')
def keras():
    return render_template('keras.html')

@app.route('/random-regression-tree')
def random_regression_tree():
    return render_template('random_regression_tree.html')

currentCode = []

@app.route('/update-layer', methods=['POST'])
def update_layer():
    global currentCode 
    data = request.json
    maxLayer = data.get('maxLayer')
    layer = data.get('layer')
    units = data.get('units')
    activation = data.get('activation')
    batchNormalization = data.get('batchNormalization')
    dropoutRate = data.get('dropoutRate')

    if layer and units and activation:
        if len(currentCode) < layer:
            currentCode.extend([""] * (layer - len(currentCode)))
        elif len(currentCode) > maxLayer:
            currentCode = currentCode[:maxLayer]

        layerCode = f"keras.layers.Dense({units}, activation='{activation}'),"

        if batchNormalization:
            layerCode += "\n    keras.layers.BatchNormalization(),"

        if dropoutRate and float(dropoutRate) > 0:
            layerCode += f"\n    keras.layers.Dropout({dropoutRate}),"

        currentCode[layer - 1] = layerCode

        wrappedCode = ["model = keras.Sequential(["] + [f"    {line}" for line in currentCode if line] + ["])"]

        return jsonify({'status': 'success', 'code': wrappedCode})

    return jsonify({'status': 'error', 'message': 'Invalid data'}), 400

@app.route('/get-layers', methods=['GET'])
def get_layers():
    return jsonify({'layers': currentCode})

@app.route('/submit', methods=['POST']) 
def submit():
    try:
        print("Current Code:", currentCode) 
        with open('model.py', 'w') as model_file:
            model_file.write("from tensorflow import keras\n")
            model_file.write("\n".join(["model = keras.Sequential(["] + [f"    {line}" for line in currentCode if line] + ["])"]))
            model_file.write("\nmodel.compile(optimizer='adam', loss='mean_squared_error')\n")
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)