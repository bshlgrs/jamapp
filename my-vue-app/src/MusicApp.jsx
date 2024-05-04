import { useState, useEffect, useRef, forwardRef } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import { Vex, Stave, StaveNote, Formatter } from "vexflow";
import { Score } from 'react-vexflow';
import './MusicApp.css'
import { parseSong, renderSong } from 'chord-mark/lib/chord-mark.js';
import abcjs from "abcjs";

import PieSocket from 'piesocket-js';


class Song {
    constructor(originalParsedSong, sections) {
        this.originalParsedSong = originalParsedSong;
        this.sections = sections;
    }

    getAllSectionsAfterBarPositionAndOffset(barPosition) {
        let res = [];
        let currentBarPosition = 0;
        let initialOffset = null;
        for (const section of this.sections) {
            currentBarPosition += section.barLength;
            if (currentBarPosition > barPosition) {
                res.push(section);
            } else {
                initialOffset = currentBarPosition;
            }
        }
        return [res, initialOffset];
    }

}

class Section {
    constructor(label, lines) {
        this.label = label;
        this.lines = lines;
    }

    getLastLine() {
        return this.lines[this.lines.length - 1];
    }

    get barLength() {
        return this.lines.reduce((acc, line) => acc + line.barLength, 0);
    }

    linesAndOffsetAfterBarPosition(barPosition) {
        let res = [];
        let currentBarPosition = 0;
        let initialOffset = null;
        for (const line of this.lines) {
            currentBarPosition += line.barLength;
            if (currentBarPosition > barPosition) {
                res.push(line);
            } else {
                initialOffset = currentBarPosition;
            }
        }
        return [res, initialOffset];
    }

    getCurrentLineIdx(barPosition) {
        let currentBarPosition = 0;
        for (let i = 0; i < this.lines.length; i++) {
            const line = this.lines[i];
            currentBarPosition += line.barLength;
            if (currentBarPosition > barPosition) {
                return i;
            }
        }
        return null;
    }

    getCurrentLine(barPosition) {
        const idx = this.getCurrentLineIdx(barPosition);
        return this.lines[idx];
    }

    get linesWithPositions() {
        let res = [];
        let currentBarPosition = 0;
        for (const line of this.lines) {
            res.push([currentBarPosition, line]);
            currentBarPosition += line.barLength;
        }
        return res;

    }
}

class Line {
    constructor() {
        this.chord = null;
        this.lyric = null;
    }

    get barLength() {
        return this.chord.model.allBars.length;
    }
}

function buckParse(data) {
    const originalParsedSong = parseSong(data);

    const song = new Song(originalParsedSong, []);

    let currentSection = null;

    for (const line of originalParsedSong.allLines) {
        if (line.type === 'sectionLabel') {
            if (currentSection) {
                song.sections.push(currentSection);
            }
            currentSection = new Section(
                line, []
            )
        }
        if (line.type === 'chord') {

            currentSection.lines.push(new Line());
            currentSection.getLastLine().chord = line;
        }
        if (line.type === 'lyric') {
            if (currentSection.getLastLine().lyric) {
                console.log('Two lyrics in a row at', line, currentSection.getLastLine().lyric);
                song.sections.push(currentSection);
                return song;
            }
            currentSection.getLastLine().lyric = line;
        }
    }
    if (currentSection) {
        song.sections.push(currentSection);
    }
    return song;
}

const addNbspsIfSpaceAtStartOrEnd = (str) => {
    if (str.startsWith(' ')) {
        str = '\u00A0' + str;
    }
    if (str.endsWith(' ')) {
        str = str + '\u00A0';
    }
    return str;
}

function renderLyricsAndChords(lyricObj, chordObj, options) {
    // console.log(lyricObj, chordObj);
    // const lyricLine = lyricObj.string;
    const { showChords, showLyrics, lyricFontSize } = options;

    const chordLine = chordObj.string;
    const splitLyricString = (lyricObj?.string || '').split('|');
    const lyricString = splitLyricString[0];
    const instructionsString = splitLyricString[1] || '';
    const instructionFragments = instructionsString.split('_');

    const showInstructions = true && instructionsString;

    const abcString = options.showMelodies ? (splitLyricString.slice(2).join("|") || null) : null;
    console.log(abcString);

    // debugger;
    const lyricFragments = lyricString.split('_');
    const chordFragments = chordLine.trim().split(' ');
    const out = [];

    const barNums = chordObj.model.allBars.flatMap((bar, idx) => bar.allChords.map((chord) => idx));

    if (showLyrics) {
        out.push(<div key={-1} className={'chord-lyric-item'}>
            {showChords && <div className='chord'></ div>}
            <div className='lyric' style={{ fontSize: lyricFontSize }}>{addNbspsIfSpaceAtStartOrEnd(lyricFragments[0] || '')}
            </div>
            {showInstructions && instructionFragments[0] && <div className='instructions'>{instructionFragments[0]}</div>}</div>)
        if (showChords) {
            out.push(<div className='bar-divider'></div>);
        }
    }
    for (let i = 0; i < chordFragments.length; i++) {

        out.push(<div key={i} className={'chord-lyric-item'}>

            {showChords && <div className='chord'> {chordFragments[i]} </ div>}
            {showLyrics && <div className='lyric' style={{ fontSize: lyricFontSize }}>{addNbspsIfSpaceAtStartOrEnd(lyricFragments[i + 1] || '')}</div>}
            {showInstructions && instructionFragments[i + 1] && <div className='instructions'>{instructionFragments[i + 1]}</div>}
        </div>)
        if (barNums[i] !== barNums[i + 1]) {
            out.push(<div key={i + 'bar'} className='bar-divider'></div>);
        }
    }
    return <div><div className='chord-lyric-display'>
        {out}</div>
        {abcString && <AbcjsRenderer notation={abcString} transposition={options.transposition} />}
    </div>
}

const myId = Math.random().toString(36).substring(7);

function App() {
    const [allSongs, setAllSongs] = useState({});
    const [position, setPosition] = useState(0);
    const songTitles = Object.keys(allSongs).sort();
    const [songIdx, setSongIdx] = useState(null);
    const [showOptions, setShowOptions] = useState(false);

    const [showChords, setShowChords] = useState(true);
    const [showLyrics, setShowLyrics] = useState(true);
    const [showMelodies, setShowMelodies] = useState(true);
    const [iAmScoller, setIAmScroller] = useState(false);
    const [transposition, setTransposition] = useState(0);

    const [lyricFontSize, setLyricFontSize] = useState(16);

    useEffect(() => {
        fetch('/api/all-songs').then((response) => response.json()).then((data) => {
            setAllSongs(data);
            setSongIdx(0);
        });
    }, []);

    const [numLinesInPage, setNumLinesInPage] = useState(4);

    const piesocketRef = useRef(null);

    const receiveMessage = (message) => {
        console.log("Received message: ", message);
        const data = JSON.parse(message.message);
        setPosition(data.location);
        if (data.songIdx) { setSongIdx(data.songIdx); }
    }

    useEffect(() => {

        const pieSocket = new PieSocket({
            clusterId: "free.blr2",
            apiKey: "MK1odop2SEVPcJq33QZpXND61QaI5RqcJrqqKmwe",
            notifySelf: false
        });

        pieSocket.subscribe("chat-room").then((channel) => {
            // console.log("Channel is ready");
            channel.listen("new_message", (data, meta) => {
                if (data.from !== myId) {
                    receiveMessage(data);
                }
            });

            piesocketRef.current = channel;
            // debugger;
        });
    }, []);

    const sendMessage = (message) => {

        piesocketRef.current.publish("new_message", {
            from: myId,
            message: message
        })
    }

    const handleKeyDown = (event) => {
        if (event.code === 'ArrowRight') {
            setPosition((pos) => {
                sendMessage(JSON.stringify({ location: pos + 1, songIdx: songIdx }));
                return pos + 1;
            });
            event.preventDefault();
        } else if (event.code === 'ArrowLeft') {

            setPosition((pos) => {
                if (pos === 0) {
                    return pos;
                } else {
                    sendMessage(JSON.stringify({ location: pos - 1, songIdx: songIdx }));
                    return pos - 1;

                }
            });
            event.preventDefault();
        }
        // debugger;


    };
    const handleSpacebarPress = () => {
        setPosition((pos) => {
            sendMessage(JSON.stringify({ location: pos + 1, songIdx: songIdx }));
            return pos + 1;
        });
        // sendMessage(JSON.stringify({ location: position + 1 }));
        // debugger;
    };

    const myHandler = (e) => handleKeyDown(e);

    useEffect(() => {
        // Function to handle the keydown event


        // Adding the keydown event listener to the window object
        window.addEventListener('keydown', myHandler);

        // Cleanup function to remove the event listener
        return () => {
            window.removeEventListener('keydown', myHandler);
        };
    }, []); // Empty dependency array means this effect runs only once after the initial render


    if (songIdx === null) {
        return <div>Loading...</div>;
    }
    console.log('parsing', songTitles[songIdx]);
    let song = buckParse(allSongs[songTitles[songIdx]]);


    const allLines = song.sections.flatMap(section => section.lines);
    for (let i = 0; i < allLines.length; i++) {
        allLines[i].index = i;
    }

    const lineStride = numLinesInPage - 1;
    if (lineStride < 1) {
        throw new Error('lineStride must be at least 1');
    }

    let pages = [];
    for (let i = 0; i < allLines.length; i += lineStride) {
        pages.push([i, allLines.slice(i, i + numLinesInPage)]);
    }
    // debugger;

    let currentPageSearch = pages.find(([start, lines]) => {
        return start <= position && position < start + lineStride;
    });
    const currentPage = currentPageSearch ? currentPageSearch[1] : null;



    return <div>
        <div>
            <select value={songIdx} onChange={(e) => {
                setSongIdx(e.target.value);
                setPosition(0);

                sendMessage(JSON.stringify({ location: 0, songIdx: e.target.value }));
            }}>
                {songTitles.map((title, idx) => <option key={idx} value={idx}>{title}</option>)}
            </select>
            <button onClick={() => {
                setSongIdx((songIdx + 1) % songTitles.length);
                setPosition(0);
                sendMessage(JSON.stringify({ location: 0, songIdx: (songIdx + 1) % songTitles.length }));
            }}>Next</button>
            <button onClick={() => {
                setSongIdx((songIdx - 1 + songTitles.length) % songTitles.length);
                setPosition(0);
                sendMessage(JSON.stringify({ location: 0, songIdx: (songIdx - 1 + songTitles.length) % songTitles.length }));
            }}>Previous</button>

            <button onClick={() => setShowOptions(!showOptions)}>Options</button>
            {showOptions && <div>
                <label>I am scroller?</label>
                <input type="checkbox" checked={iAmScoller} onChange={(e) => setIAmScroller(e.target.checked)} />
                <label>Lines per page</label>
                <button onClick={() => setNumLinesInPage(numLinesInPage + 1)}>+</button>
                <button onClick={() => setNumLinesInPage(numLinesInPage + 100)}>+100</button>
                {numLinesInPage > 2 && <button onClick={() => setNumLinesInPage(numLinesInPage - 1)}>-</button>}
                <button onClick={() => setNumLinesInPage(5)}>5</button>
                <label>Chords</label>
                <input type="checkbox" checked={showChords} onChange={(e) => setShowChords(e.target.checked)} />
                <label>Lyrics</label>
                <input type="checkbox" checked={showLyrics} onChange={(e) => setShowLyrics(e.target.checked)} />
                <label>Melodies</label>
                <input type="checkbox" checked={showMelodies} onChange={(e) => setShowMelodies(e.target.checked)} />
                <button onClick={() => {
                    fetch('/api/all-songs').then((response) => response.json()).then((data) => {
                        setAllSongs(data);
                        // buckParse(data[songTitles[songIdx]]);
                    })
                }}>
                    Refresh songs</button>
                <label>Lyric font size</label>
                <button onClick={() => setLyricFontSize(lyricFontSize + 1)}>+</button>
                <button onClick={() => setLyricFontSize(lyricFontSize - 1)}>-</button>
                <label>Transposition: {transposition}</label>
                <button onClick={() => setTransposition(transposition + 1)}>+</button>
                <button onClick={() => setTransposition(transposition - 1)}>-</button>
            </div>}

        </div>

        {currentPage?.map((x, idx) => <div key={idx} className={'line ' + (position == x.index ? "special" : '')}>
            {/* <div>{x.chord?.string}</div>
            <div>{x.lyric?.string}</div> */}
            {renderLyricsAndChords(x.lyric, x.chord, {
                showChords: showChords,
                showLyrics: showLyrics,
                showMelodies: showMelodies,
                lyricFontSize: lyricFontSize,
                transposition: transposition
            })}
        </div>)}
        {currentPageSearch && <div>page {(currentPageSearch[0]) / lineStride + 1} of {pages.length}</div>}


    </div>;
}

const WrappedScore = (props) => {
    const wrapperRef = useRef(null);

    // useEffect(() => {
    //     // Access the rendered HTML elements of the Score component
    //     const scoreElement = wrapperRef.current.querySelector('.score-component');
    //     debugger;
    //     // Perform mutations on the rendered elements
    //     if (scoreElement) {
    //         // Example mutation: Change the text color to red
    //         scoreElement.style.color = 'red';

    //         // Example mutation: Add a CSS class to the element
    //         scoreElement.classList.add('custom-class');

    //         // Example mutation: Modify the inner HTML
    //         scoreElement.innerHTML = 'Modified Score';
    //         // debugger;
    //     }
    // }, []);

    return (
        <div ref={wrapperRef}>
            <Score {...props} />
        </div>
    );
};

// function WrappedScore({ staves }) {
//     const myRef = useRef(null);

//     useEffect(() => {
//         // This code will run after the component is mounted (and after every re-render)
//         console.log('Component mounted or updated!');
//         // You can also interact with the DOM element here
//         if (myRef.current) {
//             debugger;
//         }
//     }, []); // Empty dependency array to run only on mount

//     return <Score staves={staves} ref={myRef} />
// }


const Canvas = (props) => {


    return <canvas ref={props.canvasRef} {...props} />;
};



const AbcjsRenderer = ({ notation, transposition }) => {
    const paperRef = useRef(null);

    useEffect(() => {
        if (paperRef.current && notation) {
            console.log('transposition', transposition);
            abcjs.renderAbc(paperRef.current, notation.replace("\\n", "\n"), { visualTranspose: transposition });
        }
    }, [notation, transposition]);

    return <div ref={paperRef} onClick={() => {
        // open https://editor.drawthedots.com/?t= + encodeURIComponent(notation)
        window.open('https://editor.drawthedots.com/?t=' + encodeURIComponent(notation.replace("\\n", "\n")));
    }} />;
};


export default App
