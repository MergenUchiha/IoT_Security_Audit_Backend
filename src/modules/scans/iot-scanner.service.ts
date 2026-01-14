import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

export interface ScanResult {
  host: string;
  ports: Array<{
    port: number;
    protocol: string;
    state: string;
    service: string;
    version?: string;
  }>;
  os?: {
    name: string;
    accuracy: number;
  };
  vulnerabilities: Array<{
    id: string;
    title: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    cvss: number;
  }>;
}

@Injectable()
export class IoTScannerService {
  private readonly logger = new Logger(IoTScannerService.name);
  private readonly scanResultsDir = path.join(process.cwd(), 'scan_results');

  constructor() {
    this.initScanResultsDir();
  }

  private async initScanResultsDir() {
    try {
      await fs.mkdir(this.scanResultsDir, { recursive: true });
      this.logger.log(`Scan results directory: ${this.scanResultsDir}`);
    } catch (error) {
      this.logger.error('Failed to create scan results directory', error);
    }
  }

  /**
   * Check if nmap is installed
   */
  async checkNmapInstalled(): Promise<boolean> {
    try {
      await execAsync('nmap --version');
      return true;
    } catch (error) {
      this.logger.warn('nmap is not installed. Install it: sudo apt install nmap');
      return false;
    }
  }

  /**
   * Discover devices on the network
   */
  async discoverDevices(subnet: string = '192.168.1.0/24'): Promise<string[]> {
    this.logger.log(`Discovering devices on ${subnet}...`);
    
    const hasNmap = await this.checkNmapInstalled();
    if (!hasNmap) {
      throw new Error('nmap is not installed. Please install nmap to scan network.');
    }

    try {
      // Simple ping scan to find live hosts
      const { stdout } = await execAsync(`nmap -sn ${subnet} -oG -`);
      
      const hosts: string[] = [];
      const lines = stdout.split('\n');
      
      for (const line of lines) {
        if (line.includes('Status: Up')) {
          const match = line.match(/Host: ([\d.]+)/);
          if (match) {
            hosts.push(match[1]);
          }
        }
      }
      
      this.logger.log(`Found ${hosts.length} devices: ${hosts.join(', ')}`);
      return hosts;
    } catch (error) {
      this.logger.error('Failed to discover devices', error);
      throw error;
    }
  }

  /**
   * Scan a single device
   */
  async scanDevice(ipAddress: string): Promise<ScanResult> {
    this.logger.log(`Starting comprehensive scan of ${ipAddress}...`);
    
    const hasNmap = await this.checkNmapInstalled();
    if (!hasNmap) {
      throw new Error('nmap is not installed');
    }

    const timestamp = Date.now();
    const outputFile = path.join(this.scanResultsDir, `scan_${ipAddress.replace(/\./g, '_')}_${timestamp}`);

    try {
      // Run comprehensive nmap scan
      // -sV: Version detection
      // -O: OS detection
      // -A: Aggressive scan (OS detection, version detection, script scanning, traceroute)
      // --script vuln: Run vulnerability detection scripts
      const scanCommand = `sudo nmap -sV -O --script vuln -oX ${outputFile}.xml -oN ${outputFile}.txt ${ipAddress}`;
      
      this.logger.log(`Executing: ${scanCommand}`);
      const { stdout, stderr } = await execAsync(scanCommand, { 
        timeout: 300000, // 5 minutes timeout
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });

      if (stderr && !stderr.includes('WARNING')) {
        this.logger.warn(`Scan stderr: ${stderr}`);
      }

      // Parse the XML output
      const xmlContent = await fs.readFile(`${outputFile}.xml`, 'utf-8');
      const result = await this.parseNmapXML(xmlContent, ipAddress);
      
      this.logger.log(`Scan completed for ${ipAddress}. Found ${result.ports.length} ports, ${result.vulnerabilities.length} vulnerabilities`);
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to scan ${ipAddress}`, error);
      throw error;
    }
  }

  /**
   * Quick port scan
   */
  async quickPortScan(ipAddress: string): Promise<number[]> {
    this.logger.log(`Quick port scan of ${ipAddress}...`);
    
    try {
      // Scan common ports
      const { stdout } = await execAsync(`nmap -p 21,22,23,25,80,443,554,1883,8080,8883,9999 --open ${ipAddress}`);
      
      const openPorts: number[] = [];
      const lines = stdout.split('\n');
      
      for (const line of lines) {
        const match = line.match(/(\d+)\/tcp\s+open/);
        if (match) {
          openPorts.push(parseInt(match[1]));
        }
      }
      
      return openPorts;
    } catch (error) {
      this.logger.error('Failed to scan ports', error);
      return [];
    }
  }

  /**
   * Parse nmap XML output
   */
  private async parseNmapXML(xmlContent: string, ipAddress: string): Promise<ScanResult> {
    const result: ScanResult = {
      host: ipAddress,
      ports: [],
      vulnerabilities: []
    };

    // Simple XML parsing (in production, use a proper XML parser like xml2js)
    try {
      // Parse ports
      const portMatches = xmlContent.matchAll(/<port protocol="([^"]+)" portid="(\d+)">[\s\S]*?<state state="([^"]+)"[\s\S]*?<service name="([^"]+)"[^>]*(?:product="([^"]+)")?[^>]*>/g);
      
      for (const match of portMatches) {
        result.ports.push({
          protocol: match[1],
          port: parseInt(match[2]),
          state: match[3],
          service: match[4],
          version: match[5] || undefined
        });
      }

      // Parse OS detection
      const osMatch = xmlContent.match(/<osmatch name="([^"]+)" accuracy="(\d+)"/);
      if (osMatch) {
        result.os = {
          name: osMatch[1],
          accuracy: parseInt(osMatch[2])
        };
      }

      // Parse vulnerability scripts
      const vulnMatches = xmlContent.matchAll(/<script id="([^"]+)"[^>]*output="([^"]+)"/g);
      
      for (const match of vulnMatches) {
        const scriptId = match[1];
        const output = match[2];
        
        if (scriptId.includes('vuln') || output.toLowerCase().includes('vulnerable')) {
          const severity = this.determineSeverity(output);
          const cvss = this.extractCVSS(output);
          
          result.vulnerabilities.push({
            id: scriptId,
            title: this.extractVulnTitle(scriptId, output),
            severity,
            description: output.substring(0, 500),
            cvss
          });
        }
      }

      // Check for common IoT vulnerabilities
      this.checkCommonIoTVulnerabilities(result);

    } catch (error) {
      this.logger.error('Failed to parse nmap XML', error);
    }

    return result;
  }

  /**
   * Check for common IoT vulnerabilities based on open ports and services
   */
  private checkCommonIoTVulnerabilities(result: ScanResult) {
    for (const port of result.ports) {
      // Telnet (insecure remote access)
      if (port.port === 23 && port.state === 'open') {
        result.vulnerabilities.push({
          id: 'IOT-TELNET-001',
          title: 'Insecure Telnet Service Enabled',
          severity: 'high',
          description: 'Telnet transmits data in cleartext, including passwords. This is a major security risk.',
          cvss: 7.5
        });
      }

      // Unencrypted HTTP
      if (port.port === 80 && port.state === 'open') {
        result.vulnerabilities.push({
          id: 'IOT-HTTP-001',
          title: 'Unencrypted HTTP Web Interface',
          severity: 'medium',
          description: 'Web interface is accessible over unencrypted HTTP, exposing credentials and data.',
          cvss: 5.3
        });
      }

      // RTSP (often vulnerable in cameras)
      if (port.port === 554 && port.state === 'open') {
        result.vulnerabilities.push({
          id: 'IOT-RTSP-001',
          title: 'RTSP Stream Potentially Unauthenticated',
          severity: 'high',
          description: 'RTSP streaming port is open. Many IoT cameras have unauthenticated RTSP streams.',
          cvss: 7.0
        });
      }

      // Unencrypted MQTT
      if (port.port === 1883 && port.state === 'open') {
        result.vulnerabilities.push({
          id: 'IOT-MQTT-001',
          title: 'Unencrypted MQTT Broker',
          severity: 'medium',
          description: 'MQTT broker is accessible without encryption. Should use port 8883 with TLS.',
          cvss: 5.9
        });
      }

      // Common backdoor port
      if (port.port === 9999 && port.state === 'open') {
        result.vulnerabilities.push({
          id: 'IOT-BACKDOOR-001',
          title: 'Potential Backdoor Service',
          severity: 'critical',
          description: 'Port 9999 is commonly used for backdoors in compromised IoT devices.',
          cvss: 9.8
        });
      }
    }

    // Check for weak default credentials (heuristic)
    const webPorts = result.ports.filter(p => [80, 443, 8080].includes(p.port));
    if (webPorts.length > 0) {
      result.vulnerabilities.push({
        id: 'IOT-CRED-001',
        title: 'Potentially Using Default Credentials',
        severity: 'high',
        description: 'Device may be using default credentials. Manual verification recommended.',
        cvss: 8.0
      });
    }
  }

  /**
   * Determine vulnerability severity from output
   */
  private determineSeverity(output: string): 'critical' | 'high' | 'medium' | 'low' {
    const lowerOutput = output.toLowerCase();
    
    if (lowerOutput.includes('critical') || lowerOutput.includes('remote code execution')) {
      return 'critical';
    }
    if (lowerOutput.includes('high') || lowerOutput.includes('authentication bypass')) {
      return 'high';
    }
    if (lowerOutput.includes('medium') || lowerOutput.includes('information disclosure')) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Extract CVSS score from output
   */
  private extractCVSS(output: string): number {
    const cvssMatch = output.match(/CVSS[:\s]+(\d+\.?\d*)/i);
    if (cvssMatch) {
      return parseFloat(cvssMatch[1]);
    }
    
    // Default CVSS based on keywords
    if (output.toLowerCase().includes('critical')) return 9.0;
    if (output.toLowerCase().includes('high')) return 7.0;
    if (output.toLowerCase().includes('medium')) return 5.0;
    return 3.0;
  }

  /**
   * Extract vulnerability title from script ID and output
   */
  private extractVulnTitle(scriptId: string, output: string): string {
    // Try to extract CVE
    const cveMatch = output.match(/CVE-\d{4}-\d+/);
    if (cveMatch) {
      return cveMatch[0];
    }
    
    // Clean up script ID
    return scriptId
      .replace('http-vuln-', '')
      .replace('ssl-', '')
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Test scan without requiring root (for development)
   */
  async testScan(ipAddress: string): Promise<ScanResult> {
    this.logger.log(`Running test scan for ${ipAddress}...`);
    
    // Simulated scan results for testing
    return {
      host: ipAddress,
      ports: [
        { port: 80, protocol: 'tcp', state: 'open', service: 'http' },
        { port: 22, protocol: 'tcp', state: 'open', service: 'ssh' },
        { port: 443, protocol: 'tcp', state: 'open', service: 'https' },
      ],
      os: {
        name: 'Linux 3.x',
        accuracy: 85
      },
      vulnerabilities: [
        {
          id: 'IOT-HTTP-001',
          title: 'Unencrypted HTTP Web Interface',
          severity: 'medium',
          description: 'Web interface accessible over HTTP',
          cvss: 5.3
        },
        {
          id: 'IOT-CRED-001',
          title: 'Default Credentials',
          severity: 'high',
          description: 'Device may be using default credentials',
          cvss: 8.0
        }
      ]
    };
  }
}