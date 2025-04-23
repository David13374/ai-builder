from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
from database import db, User
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, BooleanField
from wtforms.fields import EmailField
from wtforms.validators import DataRequired, Email, EqualTo, Length, ValidationError
import os
from dotenv import load_dotenv
from functools import wraps
from flask_wtf.csrf import CSRFProtect

csrf = CSRFProtect()

load_dotenv()

#TODO: Change to correct path


MODEL_DIR = os.path.join(os.path.expanduser('~'), 'models')
if not os.path.exists(MODEL_DIR):
    os.makedirs(MODEL_DIR)

app = Flask(__name__)
app.config['SECRET_KEY'] = os.urandom(24)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

app.config['DEBUG'] = True
app.config['TEMPLATES_AUTO_RELOAD'] = True
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

class LoginForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    password = PasswordField('Password', validators=[DataRequired()])
    remember_me = BooleanField('Remember Me')

class SignupForm(FlaskForm):
    username = StringField('Username', validators=[
        DataRequired(), 
        Length(min=3, max=80)
    ])
    email = EmailField('Email', validators=[
        DataRequired(), 
        Email(message='Invalid email address')
    ])
    password = PasswordField('Password', validators=[
        DataRequired(),
        Length(min=6, message='Password must be at least 6 characters long')
    ])
    confirm_password = PasswordField('Confirm Password', validators=[
        DataRequired(),
        EqualTo('password', message='Passwords must match')
    ])

    def validate_username(self, username):
        user = User.query.filter_by(username=username.data).first()
        if user:
            raise ValidationError('Username already taken')

    def validate_email(self, email):
        user = User.query.filter_by(email=email.data).first()
        if user:
            raise ValidationError('Email already registered')

def create_app():
    app = Flask(__name__)
    csrf.init_app(app)
    app.config['SECRET_KEY'] = os.urandom(24)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)

    with app.app_context():
        db.create_all()

    return app

app = create_app()

@app.cli.command("init-db")
def init_db():
    """Initialize the database."""
    with app.app_context():
        db.create_all()
        print('Database initialized!')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')

        if User.query.filter_by(username=username).first():
            flash('Username already exists')
            return redirect(url_for('register'))

        if User.query.filter_by(email=email).first():
            flash('Email already registered')
            return redirect(url_for('register'))

        user = User(username=username, email=email)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()

        return redirect(url_for('login'))
    return render_template('register.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    form = SignupForm()
    if form.validate_on_submit():
        if User.query.filter_by(username=form.username.data).first():
            flash('Username already exists')
            return redirect(url_for('signup'))
        
        if User.query.filter_by(email=form.email.data).first():
            flash('Email already registered')
            return redirect(url_for('signup'))
        
        user = User(username=form.username.data, email=form.email.data)
        user.set_password(form.password.data)
        db.session.add(user)
        db.session.commit()
        
        flash('Registration successful! Please login.')
        return redirect(url_for('login'))
    
    return render_template('signup.html', form=form)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if 'user_id' in session:
        return redirect(url_for('index'))
        
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        if user and user.check_password(form.password.data):
            session['user_id'] = user.id
            flash('Logged in successfully.')
            return redirect(url_for('index'))
        flash('Invalid username or password')
    return render_template('login.html', form=form)

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    return redirect(url_for('login'))

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/keras')
@login_required
def keras():
    return render_template('keras.html')

@app.route('/random-regression-tree')
@login_required
def random_regression_tree():
    return render_template('random_regression_tree.html')


@app.route('/initial-update', methods=['POST'])
def initial_update():
    try:
        data = request.json
        maxLayer = data.get('maxLayer')
        model_code = []

        for i in range(maxLayer):
            layerCode = f"keras.layers.Dense(128, activation='relu'), "
            model_code.append(layerCode)

        wrappedCode = ["model = keras.Sequential(["] + [f"    {line}" for line in model_code if line] + ["])"]
        
        session['model_code'] = model_code

        return jsonify({'status': 'success', 'code': wrappedCode})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/update-layer', methods=['POST'])
def update_layer():
    try:
        if not request.is_json:
            return jsonify({'status': 'error', 'message': 'Invalid content type'}), 400
        
        data = request.json
        if not data:
            return jsonify({'status': 'error', 'message': 'No data received'}), 400
            
        maxLayer = data.get('maxLayer')
        layer = data.get('layer')
        units = int(data.get('units'))
        activation = data.get('activation')
        batchNormalization = bool(data.get('batchNormalization'))
        dropoutRate = float(data.get('dropoutRate'))

        if 'model_code' not in session:
            session['model_code'] = []
        
        model_code = session.get('model_code', [])

        if len(model_code) < maxLayer:
            model_code.extend([""] * (maxLayer - len(model_code)))
        elif len(model_code) > maxLayer:
            model_code = model_code[:maxLayer]

        layerCode = f"keras.layers.Dense({units}, activation='{activation}'), "
        if batchNormalization:
            layerCode += "\n    keras.layers.BatchNormalization(), "
        if dropoutRate > 0:
            layerCode += f"\n    keras.layers.Dropout(rate={dropoutRate}), "

        model_code[layer - 1] = layerCode
        session['model_code'] = model_code
        session.update()
        session.modified = True

        wrappedCode = ["model = keras.Sequential(["] + [f"    {line}" for line in model_code if line] + ["])"]
        return jsonify({'status': 'success', 'code': wrappedCode})

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/submit', methods=['POST'])
def submit():
    try:
        if 'model_code' not in session:
            return jsonify({'status': 'error', 'message': 'No model defined'}), 400
            
        model_code = session.get('model_code', [])
        if not model_code:
            return jsonify({'status': 'error', 'message': 'Model is empty'}), 400

        full_code = ["from tensorflow import keras\n"]
        full_code.extend(["model = keras.Sequential(["] + 
                       [f"    {line}" for line in model_code if line] + 
                       ["])"])
        full_code.append("\nmodel.compile(optimizer='adam', loss='mean_squared_error')\n")

        model_path = os.path.join(MODEL_DIR, 'model.py')
        with open(model_path, 'w') as f:
            f.write('\n'.join(full_code))

        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
    
@app.errorhandler(404)
def not_found_error(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return render_template('500.html'), 500

@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    return response

if __name__ == '__main__':
    app.run(
        debug=True,
        use_reloader=True,
        extra_files=[
            './templates/*',
            './static/*'
        ]
    )