from tensorflow import keras

model = keras.Sequential([
    keras.layers.Dense(128, activation='relu'),
    keras.layers.Dense(128, activation='relu'),
])

model.compile(optimizer='adam', loss='mean_squared_error')