import * as http from 'http';

type PanasonicResponse = ['ok' | 'error' | 'off', string[] | null];

const HEADERS = {
  'User-Agent': 'MEI-LAN-REMOTE-CALL',
  'Content-Type': 'application/x-www-form-urlencoded',
};

const KEYS = [
  'POWER',
  'OP_CL',
  'PLAYBACK',
  'PAUSE',
  'STOP',
  'SKIPFWD',
  'SKIPREV',
  'REV',
  'D0',
  'D1',
  'D2',
  'D3',
  'D4',
  'D5',
  'D6',
  'D7',
  'D8',
  'D9',
  'D12',
  'SHARP', // '#' key
  'CLEAR', // '*' / CANCEL
  'UP',
  'DOWN',
  'LEFT',
  'RIGHT',
  'SELECT',
  'RETURN',
  'EXIT',
  'MLTNAVI', // HOME
  'DSPSEL', // STATUS
  'TITLE',
  'MENU',
  'PUPMENU',
  'SHFWD1',
  'SHFWD2',
  'SHFWD3',
  'SHFWD4',
  'SHFWD5',
  'SHREV1',
  'SHREV2',
  'SHREV3',
  'SHREV4',
  'SHREV5',
  'JLEFT',
  'JRIGHT',
  'RED',
  'BLUE',
  'GREEN',
  'YELLOW',
  'NETFLIX',
  'SKYPE',
  'V_CAST',
  '3D',
  'NETWORK',
  'AUDIOSEL',
  'KEYS',
  'CUE',
  'CHROMA',
  'MNBACK',
  'MNSKIP',
  '2NDARY',
  'PICTMD',
  'DETAIL',
  'RESOLUTN',
  'OSDONOFF',
  'P_IN_P',
];

export class PanasonicBD {
  private _host: string;
  private _state: string | null;
  private _duration: number;
  private _variant: string;

  constructor(host: string, variant: string = 'AUTO') {
    this._host = host;
    this._state = null;
    this._duration = 0;
    this._variant = variant; // 'AUTO', 'BD', or 'UB'
  }

  sendCmd(
    url: string,
    data: string,
    callback: (err: Error | null, resp: PanasonicResponse) => void,
  ): void {
    const options = {
      method: 'POST',
      timeout: 5000,
      headers: {
        ...HEADERS,
        'Content-Length': Buffer.byteLength(data),
      },
    };

    console.log('HTTP Request Details:');
    console.log('URL:', url);
    console.log('Options:', JSON.stringify(options, null, 2));
    console.log('Data:', data);

    const req = http.request(url, options, (res) => {
      let rawData = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        rawData += chunk;
      });
      res.on('end', () => {
        const lines = rawData.split('\r\n');
        if (lines.length < 2) {
          callback(null, ['error', null]);
          return;
        }
        const firstLine = lines[0].split(',')[0];
        if (firstLine !== '00') {
          callback(null, ['error', null]);
        } else {
          const secondLine = lines[1].split(',');
          callback(null, ['ok', secondLine]);
        }
      });
    });

    req.on('error', () => {
      this._state = 'off';
      callback(null, ['off', null]);
    });

    req.write(data);
    req.end();
  }

  sendKey(key: string, callback: (err: Error | null, resp: PanasonicResponse) => void): void {
    if (!KEYS.includes(key)) {
      callback(null, ['error', null]);
      return;
    }
    if (this._variant === 'UB') {
      callback(null, ['error', null]);
      return;
    }
    const url = `http://${this._host}/WAN/dvdr/dvdr_ctrl.cgi`;
    const data = `cCMD_RC_${key}.x=100&cCMD_RC_${key}.y=100`;
    this.sendCmd(url, data, (err, resp) => {
      if (this._variant === 'AUTO') {
        if (resp[0] === 'error') {
          this._variant = 'UB';
          callback(null, ['error', null]);
          return;
        } else {
          this._variant = 'BD';
        }
      }
      callback(null, resp);
    });
  }

  getStatus(callback: (err: Error | null, status: string[] | 'error' | 'off') => void): void {
    if (this._variant === 'UB') {
      callback(null, ['1', '0', '0', '00000000', '0']);
      return;
    }
    const url = `http://${this._host}/WAN/dvdr/dvdr_ctrl.cgi`;
    const data = 'cCMD_GET_STATUS.x=100&cCMD_GET_STATUS.y=100';
    this.sendCmd(url, data, (err, resp) => {
      if (resp[0] === 'error') {
        if (this._variant === 'AUTO') {
          this._variant = 'UB';
          callback(null, ['1', '0', '0', '00000000', '0']);
          return;
        } else {
          callback(null, 'error');
          return;
        }
      }
      if (resp[0] === 'off') {
        callback(null, 'off');
        return;
      }
      callback(null, resp[1] as string[]);
    });
  }

  getPlayStatus(
    callback: (err: Error | null, state: string, playtime: number, duration: number) => void,
  ): void {
    const url = `http://${this._host}/WAN/dvdr/dvdr_ctrl.cgi`;
    const data = 'cCMD_PST.x=100&cCMD_PST.y=100';
    this.sendCmd(url, data, (err, resp) => {
      if (resp[0] === 'off') {
        this._state = 'off';
        callback(null, 'off', 0, 0);
        return;
      } else if (resp[0] === 'error') {
        callback(null, 'error', 0, 0);
        return;
      }
      this.getStatus((err, status) => {
        if (status === 'off') {
          this._state = 'off';
          callback(null, 'off', 0, 0);
          return;
        } else if (status === 'error') {
          callback(null, 'error', 0, 0);
          return;
        }
        const stateResponse = resp[1];
        if (stateResponse === null) {
          callback(null, 'error', 0, 0);
          return;
        }
        let state: string;
        if (stateResponse[0] === '0') {
          if ((status as string[])[0] === '0') {
            state = 'standby';
          } else {
            state = 'stopped';
          }
        } else if (stateResponse[0] === '1') {
          state = 'playing';
        } else if (stateResponse[0] === '2') {
          state = 'paused';
        } else {
          state = 'unknown';
        }
        const playtime = parseInt(stateResponse[1], 10) || 0;
        const duration = parseInt((status as string[])[4], 10) || 0;
        callback(null, state, playtime, duration);
      });
    });
  }
}