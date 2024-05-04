from flask import Flask, jsonify
import os

app = Flask(__name__)

@app.route("/api/all-songs")
def hello_world():
    folder_path = '/Users/buck/repos/jam-app/my-vue-app/src/songs'
    songs = {}
    for filename in os.listdir(folder_path):
        if filename.endswith(".txt"):
            songs[filename] = open(os.path.join(folder_path, filename)).read()
    
    return jsonify(songs)

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=3002, debug=True)