import React, { useState, useEffect } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import ReactTooltip from 'react-tooltip';
import './App.css';

function App() {
  const [token, setToken] = useState('');
  const [data, setData] = useState([]);

  useEffect(() => {
    const hash = window.location.hash;
    let _token = window.localStorage.getItem('token');
    if (!_token && hash) {
      _token = hash.substring(1).split('&').find(elem => elem.startsWith('access_token')).split('=')[1];
      window.location.hash = '';
      window.localStorage.setItem('token', _token);
    }
    setToken(_token);
  }, []);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    let after = new Date('2023-01-01').getTime() / 1000;
    let before = new Date().getTime() / 1000;
    let allTracks = [];
    let next = true;
    let url = `https://api.spotify.com/v1/me/player/recently-played?limit=50&after=${after}&before=${before}`;

    while (next) {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await response.json();
      if (result.items && result.items.length > 0) {
        allTracks = allTracks.concat(result.items);
        after = result.items[result.items.length - 1].played_at;
        url = `https://api.spotify.com/v1/me/player/recently-played?limit=50&after=${after}&before=${before}`;
      } else {
        next = false;
      }
    }

    const dateMap = {};
    allTracks.forEach(item => {
      const date = item.played_at.split('T')[0];
      if (!dateMap[date]) {
        dateMap[date] = {
          date: date,
          count: 1,
          songs: {},
        };
      } else {
        dateMap[date].count += 1;
      }
      const songName = item.track.name;
      if (!dateMap[date].songs[songName]) {
        dateMap[date].songs[songName] = 1;
      } else {
        dateMap[date].songs[songName] += 1;
      }
    });

    const heatmapData = Object.values(dateMap).map(day => {
      const mostPlayedSong = Object.keys(day.songs).reduce((a, b) => (day.songs[a] > day.songs[b] ? a : b));
      return {
        date: day.date,
        count: day.count,
        mostPlayedSong: mostPlayedSong,
      };
    });

    setData(heatmapData);
  };

  const login = () => {
    const client_id = '5822ece2416a4358bab39c7799c035d0';
    const redirect_uri = 'https://ellyhonig.github.io/music-heatmap/';
    const scope = 'user-read-recently-played';
    window.location = `https://accounts.spotify.com/authorize?client_id=${client_id}&redirect_uri=${redirect_uri}&scope=${scope}&response_type=token&show_dialog=true`;
  };

  return (
    <div className="App">
      {!token ? (
        <button onClick={login}>Login to Spotify</button>
      ) : (
        <div>
          <h1>Music Listening Heatmap</h1>
          <CalendarHeatmap
            startDate={new Date('2023-01-01')}
            endDate={new Date()}
            values={data}
            classForValue={value => {
              if (!value) {
                return 'color-empty';
              }
              return `color-scale-${Math.min(value.count, 4)}`;
            }}
            tooltipDataAttrs={value => {
              if (!value.date) {
                return null;
              }
              return {
                'data-tip': `${value.date}: ${value.count} plays, Most played song: ${value.mostPlayedSong}`,
              };
            }}
            showWeekdayLabels={true}
          />
          <ReactTooltip />
        </div>
      )}
    </div>
  );
}

export default App;
