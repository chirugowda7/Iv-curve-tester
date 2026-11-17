#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <Adafruit_INA219.h>

// ---------------------------------------------------------
// ESP32 IV Curve Tester Reference Hardware Code
// ---------------------------------------------------------

// LCD Configuration (I2C address 0x27 is common, adjust if needed)
LiquidCrystal_I2C lcd(0x27, 16, 2);

// Current and Voltage Sensor (INA219 via I2C)
Adafruit_INA219 ina219;

// Button Pin Definitions
#define BTN_MENU  13
#define BTN_UP    12
#define BTN_DOWN  14
#define BTN_ENTER 27

// MOSFET PWM Pin for varying the load
#define MOSFET_PWM_PIN 25
#define PWM_CHANNEL 0
#define PWM_FREQ 5000
#define PWM_RES 8

// Variables for storing results
float voc = 0.0;
float isc = 0.0;
float pmax = 0.0;
float vmp = 0.0;
float imp = 0.0;

void setup() {
  Serial.begin(115200);
  
  // Initialize Buttons
  pinMode(BTN_MENU, INPUT_PULLUP);
  pinMode(BTN_UP, INPUT_PULLUP);
  pinMode(BTN_DOWN, INPUT_PULLUP);
  pinMode(BTN_ENTER, INPUT_PULLUP);

  // Initialize PWM for MOSFET
  ledcSetup(PWM_CHANNEL, PWM_FREQ, PWM_RES);
  ledcAttachPin(MOSFET_PWM_PIN, PWM_CHANNEL);
  ledcWrite(PWM_CHANNEL, 0); // Ensure load is off initially

  // Initialize LCD
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("IV CURVE TESTER");
  lcd.setCursor(0, 1);
  lcd.print("Initializing...");

  // Initialize INA219 Sensor
  if (!ina219.begin()) {
    Serial.println("Failed to find INA219 chip");
    lcd.setCursor(0, 1);
    lcd.print("Sensor Error!  ");
    while (1) { delay(10); }
  }

  delay(2000);
  displayIdle();
}

void loop() {
  // Wait for the user to press ENTER to start the test
  if (digitalRead(BTN_ENTER) == LOW) {
    delay(200); // Debounce
    runIVCurveSweep();
    displayResults();
    
    // Wait for MENU button to return to idle
    while (digitalRead(BTN_MENU) == HIGH) {
      delay(50);
    }
    delay(200);
    displayIdle();
  }
}

void displayIdle() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Ready to test");
  lcd.setCursor(0, 1);
  lcd.print("Press ENTER ->");
}

void displayResults() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Voc:");
  lcd.print(voc, 1);
  lcd.print("V Isc:");
  lcd.print(isc, 1);
  lcd.print("A");
  
  lcd.setCursor(0, 1);
  lcd.print("Pmax:");
  lcd.print(pmax, 1);
  lcd.print("W");
}

void runIVCurveSweep() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Running Test...");
  
  voc = 0; isc = 0; pmax = 0; vmp = 0; imp = 0;

  // Signal the start of data transmission to the connected computer
  Serial.println("---START_SWEEP---");

  // Sweep the electronic load from 0 (open circuit) to 255 (short circuit)
  for (int dutyCycle = 0; dutyCycle <= 255; dutyCycle += 5) {
    ledcWrite(PWM_CHANNEL, dutyCycle);
    delay(50); // Allow load to settle

    // Read Voltage and Current from INA219
    float shuntvoltage = ina219.getShuntVoltage_mV();
    float busvoltage = ina219.getBusVoltage_V();
    float current_mA = ina219.getCurrent_mA();
    
    float loadvoltage = busvoltage + (shuntvoltage / 1000);
    float current_A = current_mA / 1000.0;
    
    if(current_A < 0) current_A = 0; // Prevent negative readings from noise

    float power_W = loadvoltage * current_A;

    // Send data over Serial so the Python Dashboard can plot it
    Serial.print(loadvoltage);
    Serial.print(",");
    Serial.println(current_A);

    // Calculate characteristics
    if (dutyCycle == 0) {
      voc = loadvoltage; // Open Circuit Voltage
    }
    
    if (power_W > pmax) {
      pmax = power_W;
      vmp = loadvoltage;
      imp = current_A;
    }
    
    isc = current_A; // Last reading (highest load) approximates Isc
  }

  // Turn off load after sweep
  ledcWrite(PWM_CHANNEL, 0);
  
  Serial.println("---END_SWEEP---");
  
  // Output calculated metrics to Serial
  Serial.print("VOC:"); Serial.println(voc);
  Serial.print("ISC:"); Serial.println(isc);
  Serial.print("VMP:"); Serial.println(vmp);
  Serial.print("IMP:"); Serial.println(imp);
  Serial.print("PMAX:"); Serial.println(pmax);
}
