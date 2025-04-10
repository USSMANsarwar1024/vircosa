from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html')

# Optional: custom 404 page
@app.errorhandler(404)
def page_not_found(e):
    return "<h1>404 - Page Not Found</h1>", 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80)
