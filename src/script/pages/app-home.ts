import { LitElement, css, html } from 'lit';
import { property, customElement } from 'lit/decorators.js';

// For more info on the @pwabuilder/pwainstall component click here https://github.com/pwa-builder/pwa-install
import '@pwabuilder/pwainstall';

@customElement('app-home')
export class AppHome extends LitElement {

  // For more information on using properties and state in lit
  // check out this link https://lit.dev/docs/components/properties/
  @property() message = 'Welcome!!!';
  private connectedDevices = [];
  private selectedDevice = [];
  
  static get styles() {
    return css`
      #welcomeBar {
        display: flex;
        justify-content: center;
        align-items: center;
        flex-direction: column;
      }

      #welcomeBar fluent-card {
        margin-bottom: 12px;
      }

      #welcomeCard,
      #infoCard {
        padding: 18px;
        padding-top: 0px;
      }

      pwa-install {
        position: absolute;
        bottom: 16px;
        right: 16px;
      }


      #mainInfo fluent-anchor::part(control), #infoCard fluent-anchor::part(control) {
        color: white;
      }

      @media (min-width: 1024px) {
        #welcomeCard,
        #infoCard {
          width: 54%;
        }
      }

      @media (horizontal-viewport-segments: 2) {
        #welcomeBar {
          flex-direction: row;
          align-items: flex-start;
          justify-content: space-between;
        }

        #welcomeCard {
          margin-right: 64px;
        }
      }

      @media(prefers-color-scheme: light) {
        fluent-card {
          --fill-color: #edebe9;
        }

        #mainInfo fluent-anchor::part(control), #infoCard fluent-anchor::part(control) {
          color: initial;
        }
      }

      @media(prefers-color-scheme: dark) {
        fluent-card {
          --fill-color: #4e4e4e;
          color: white;
          border: none;
        }
      }
    `;
  }

  constructor() {
    super();
    var el = document.createElement("ul");
  }

  async firstUpdated() {
    // this method is a lifecycle even in lit
    // for more info check out the lit docs https://lit.dev/docs/components/lifecycle/
    console.log('This is your home page');
  }

  share() {
    if ((navigator as any).share) {
      (navigator as any).share({
        title: 'PWABuilder pwa-starter',
        text: 'Check out the PWABuilder pwa-starter!',
        url: 'https://github.com/pwa-builder/pwa-starter',
      });
    }
  }

  render() {
    return html`
  <h1>HID Explorer</h1>
  <button @click=${this.connectDevice}>Connect</button>
  <select id="deviceSelect" @input=${this.deviceSelectionChanged}></select>
  <br>
  Output report <button @click=${this.sendOutputReport}>Send</button><br>
  <textarea id="outputReport" cols="100" rows="5"></textarea><br>
  Device info<br>
  <textarea id="deviceInfo" cols="100" rows="50" disabled="">
  </textarea><br>
    `;
  }
  
  handleInputReport = event => {
	const inputReportTextView = this.shadowRoot.getElementById('inputReport');
    if (!inputReportTextView)
  	  return;

    let buffer = hex8(event.reportId);
    const reportData = new Uint8Array(event.data.buffer);
    for (let byte of reportData)
      buffer += ' ' + hex8(byte);
	inputReportTextView.innerHTML = buffer;
  };

  connectDevice = () => {
    navigator.hid.getDevices().then(devices => {
      for (let device of devices)
        this.addDevice(device);
    });
  
    navigator.hid.requestDevice({filters:[]}).then(devices => {
      if (devices.length == 0)
        return;
      
      for (let device of devices)
        this.addDevice(device);
        
      this.selectDevice(devices[0]);
    });
  };

	// Adds |device| to |connectedDevices|. Selects the device if there was no prior
	// selection.
  addDevice = device => {
    console.log('add device');
    if (this.connectedDevices.includes(device)) {
  	  console.log('device already in connectedDevices');
  	 return;
    }
    this.connectedDevices.push(device);
    console.log('device connected: ' + device.productName);
    if (this.selectedDevice.length == 0)
  	  this.selectDevice(device);
    this.updateDeviceMenu();
  };

  selectDevice = device => {
    if (this.selectedDevice)
      this.selectedDevice.oninputreport = null;
    
    if (!device) {
      this.selectedDevice = null;
    } else {
      let select = this.shadowRoot.getElementById('deviceSelect');
      for (let i = 0; i < select.options.length; ++i) {
        if (select.options[i].device === device) {
          select.value = i;
          break;
        }
      }
      this.selectedDevice = device;
    }
    
    if (this.selectedDevice) {
      this.selectedDevice.oninputreport = this.handleInputReport;
    	if (!this.selectedDevice.opened)
          this.selectedDevice.open();
    }
    
    this.updateDeviceInfo();
  };
  
  // Updates the device selection menu to match |connectedDevices|.
  updateDeviceMenu = () => {
    let select = this.shadowRoot.getElementById('deviceSelect');
    for (let i = select.options.length - 1; i >= 0; --i)
      select.options[i] = null;
    
    if (this.connectedDevices.length == 0) {
      var opt = this.shadowRoot.createElement('option');
      opt.value = 0;
      opt.device = null;
      opt.innerHTML = 'No connected devices';
      select.appendChild(opt);
      return;
    }
    
    let index = 0;
    for (let device of this.connectedDevices) {
      var opt = document.createElement('option');
      opt.value = index++;
      opt.device = device;
      opt.innerHTML = device.productName;
      select.appendChild(opt);
    }
    
    this.updateDeviceInfo();
  };
  
  updateDeviceInfo = () => {
    let textarea = this.shadowRoot.getElementById('deviceInfo');
    if (this.selectedDevice == null) {
      textarea.innerHTML = '';
      return;
    }
    
    let deviceInfo =
        'productName: ' + this.selectedDevice.productName + '\n' +
        'vendorId:    0x' + this.hex16(this.selectedDevice.vendorId) + ' (' + this.selectedDevice.vendorId + ')\n' +
        'productId:   0x' + this.hex16(this.selectedDevice.productId) + ' (' + this.selectedDevice.productId + ')\n' +
        'opened:      ' + (this.selectedDevice.opened ? 'true' : 'false') + '\n';
    
    if (this.selectedDevice.collections.length == 0) {
      deviceInfo += 'collections: None';
    } else {
      for (let i = 0; i < this.selectedDevice.collections.length; ++i) {
        const c = this.selectedDevice.collections[i];
        let inputReports = [];
        let outputReports = [];
        let featureReports = [];
        for (const r of c.inputReports)
          inputReports.push('0x' + this.hex8(r.reportId));
        for (const r of c.outputReports)
          outputReports.push('0x' + this.hex8(r.reportId));
        for (const r of c.featureReports)
          featureReports.push('0x' + this.hex8(r.reportId));
    
        deviceInfo += 'collections[' + i + ']\n';
        deviceInfo += '  Usage ' + this.hex16(c.usagePage) + ':' + this.hex16(c.usage) + '\n';
        if (inputReports.length > 0)
          deviceInfo += '  Input reports: ' + inputReports.join(', ') + '\n';
        if (outputReports.length > 0)
          deviceInfo += '  Output reports: ' + outputReports.join(', ') + '\n';
        if (featureReports.length > 0)
          deviceInfo += '  Feature reports: ' + featureReports.join(', ') + '\n';
      }
      
      for (let i = 0; i < this.selectedDevice.collections.length; ++i) {
        const c = this.selectedDevice.collections[i];
        deviceInfo += this.formatReportListInfo(c.inputReports, 'Input');
        deviceInfo += this.formatReportListInfo(c.outputReports, 'Output');
        deviceInfo += this.formatReportListInfo(c.featureReports, 'Feature');
      }
    }
    
    textarea.innerHTML = deviceInfo;
  };
  
  deviceSelectionChanged = () => {
    let select = this.shadowRoot.getElementById('deviceSelect');
	if (select != null)
	  this.selectDevice(select.options[select.value].device);
  };
  
  reportSizeAndCountAsString = (item, startBit) => {
    const bitWidth = item.reportCount * item.reportSize;
    if (bitWidth == 1)
      return '1 bit (bit ' + startBit + ')';
    
    const endBit = startBit + bitWidth - 1; 
    if (item.reportCount == 1)
      return item.reportSize + ' bits (bits ' + startBit + ' to ' + endBit + ')';
    
    return item.reportCount + ' values * ' + item.reportSize + ' bits (bits ' + startBit + ' to ' + endBit + ')';
  };

  formatReportListInfo = (reports, type) => {
    let reportInfo = '';
    for (const r of reports) {
      reportInfo += type + ' report 0x' + this.hex8(r.reportId) + '\n';
      let bitOffset = 0;
      for (const item of r.items) {
        reportInfo += '  ' + this.reportSizeAndCountAsString(item, bitOffset) + '\n';
      }
    }
    return reportInfo;
  };
  
  hex8 = value => {
    return ('00' + value.toString(16)).substr(-2).toUpperCase();
  };

  hex16 = value => {
    return ('0000' + value.toString(16)).substr(-4).toUpperCase();
  };
  
  reportSizeAndCountAsString = (item, startBit) => {
    const bitWidth = item.reportCount * item.reportSize;
    if (bitWidth == 1)
      return '1 bit (bit ' + startBit + ')';
    
    const endBit = startBit + bitWidth - 1; 
    if (item.reportCount == 1)
      return item.reportSize + ' bits (bits ' + startBit + ' to ' + endBit + ')';
    
    return item.reportCount + ' values * ' + item.reportSize + ' bits (bits ' + startBit + ' to ' + endBit + ')';
  };
  
  sendOutputReport = () => {
    if (!this.selectedDevice)
      return;
    
    const reportTextArea = this.shadowRoot.getElementById('outputReport');
    if (!reportTextArea)
      return;
    
    let data = this.parseHexArray(reportTextArea.value);
    reportTextArea.value = this.hexview(data);
    
    let reportId = data.getUint8(0);
    let reportData = new Uint8Array(data.buffer).slice(1);
    console.log(reportId, reportData);
    
    this.selectedDevice.sendReport(reportId, reportData);
  };
  
  parseHexArray = text => {
    // Remove non-hex characters.
    text = text.replace(/[^0-9a-fA-F]/g, '');
    if (text.length % 2)
      return null;
    
    // Parse each character pair as a hex byte value.
    let u8 = new Uint8Array(text.length / 2);
    for (let i = 0; i < text.length; i += 2)
      u8[i / 2] = parseInt(text.substr(i, 2), 16);
    
    return new DataView(u8.buffer);
  };
  
  hexview = data => {
    let buffer = '';
    let u8array = new Uint8Array(data.buffer);
    for (const byteValue of u8array) {
      if (buffer)
        buffer += ' ';
      buffer += this.hex8(byteValue);
    }
  return buffer;
  };
}
