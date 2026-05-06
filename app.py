from flask import Flask, render_template, jsonify
import json, os

app = Flask(__name__)
NETWORK_FILE = os.path.join(os.path.dirname(__file__), 'network.json')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/network')
def get_network():
    with open(NETWORK_FILE) as f:
        return jsonify(json.load(f))

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000)
