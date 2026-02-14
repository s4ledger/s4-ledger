// ═══════════════════════════════════════════════════════════════════
// S4 LEDGER — MASTER DEFENSE PLATFORM DATABASE v3.3.0
// 500+ platforms across all U.S. military branches
// Auto-loaded by demo-app and all S4 tools
// ═══════════════════════════════════════════════════════════════════
(function(){'use strict';

// Branch labels
const BL={USN:'U.S. Navy',USMC:'U.S. Marine Corps',USA:'U.S. Army',USAF:'U.S. Air Force',USSF:'U.S. Space Force',USCG:'U.S. Coast Guard',SOCOM:'U.S. SOCOM',JOINT:'Joint / Multi-Service'};

// Category labels for optgroups
const CL={
    svc:'Service Craft (PMS 300)',sc:'Surface Combatants',cv:'Aircraft Carriers',sub:'Submarines',
    amph:'Amphibious Warfare',mine:'Mine Warfare',pat:'Patrol & Coastal',aux:'Auxiliary & Logistics',
    nair:'Naval Aviation (Fixed-Wing)',nhelo:'Naval Aviation (Rotary-Wing)',nuav:'Naval UAVs & UAS',
    nsb:'Small Boats & Unmanned Surface/Subsurface',nwpn:'Naval Weapons & Munitions',
    mgnd:'Ground Combat Vehicles',mav:'Marine Aviation',mc4:'Marine C4ISR & Sensors',
    tank:'Armor & Main Battle Tanks',ifv:'Infantry Fighting & Combat Vehicles',
    arty:'Artillery & Fires',tac:'Tactical & Support Vehicles',aav:'Army Aviation',
    ada:'Air & Missile Defense',ac4:'Army C4ISR & EW',aeng:'Army Engineer Equipment',
    ftr:'Fighters & Attack Aircraft',bmr:'Bombers',ttpt:'Tanker & Transport Aircraft',
    isr:'ISR & Special Mission Aircraft',trn:'Trainers',fnuc:'Nuclear & Strategic Systems',
    foth:'Other USAF Assets',sat:'Satellites & Space Vehicles',sgnd:'Ground Systems & Control',
    cut:'Cutters & Patrol Vessels',caux:'USCG Aviation & Boats',
    soa:'SOCOM Aviation',sog:'SOCOM Ground & Maritime',
    jmsl:'Missiles & Munitions',jwpn:'Small Arms & Crew-Served Weapons',jc4:'Joint C4ISR Systems'
};

// ═══════════════════════════════════════════
// MASTER PLATFORM REGISTRY
// n=name, b=branch, c=category, p=programOffice
// ═══════════════════════════════════════════
const DB = {
// ──── U.S. NAVY — SERVICE CRAFT (PMS 300) ────
yrbm:{n:'YRBM — Yard Repair, Berthing & Messing Barge',b:'USN',c:'svc',p:'PMS 300'},
apl:{n:'APL — Auxiliary Personnel Lighter',b:'USN',c:'svc',p:'PMS 300'},
afdm:{n:'AFDM — Auxiliary Floating Drydock (Medium)',b:'USN',c:'svc',p:'PMS 300'},
afdl:{n:'AFDL — Auxiliary Floating Drydock (Little)',b:'USN',c:'svc',p:'PMS 300'},
ardm:{n:'ARDM — Auxiliary Repair Drydock (Medium)',b:'USN',c:'svc',p:'PMS 300'},
ydt:{n:'YDT — Large Harbor Tug (660-class)',b:'USN',c:'svc',p:'PMS 300'},
ytb:{n:'YTB — Large Harbor Tug (Natick-class)',b:'USN',c:'svc',p:'PMS 300'},
ytt:{n:'YTT — Torpedo Trials Craft',b:'USN',c:'svc',p:'PMS 300'},
yon:{n:'YON — Fuel Oil Barge (Non-Self-Propelled)',b:'USN',c:'svc',p:'PMS 300'},
yc:{n:'YC — Open Lighter (Cargo)',b:'USN',c:'svc',p:'PMS 300'},
yfn:{n:'YFN — Covered Lighter (Cargo)',b:'USN',c:'svc',p:'PMS 300'},
yfd:{n:'YFD — Floating Dry Dock (Yard)',b:'USN',c:'svc',p:'PMS 300'},
ywn:{n:'YWN — Water Barge (Non-Self-Propelled)',b:'USN',c:'svc',p:'PMS 300'},
yr:{n:'YR — Floating Workshop',b:'USN',c:'svc',p:'PMS 300'},
yp:{n:'YP — Patrol Craft (Training)',b:'USN',c:'svc',p:'PMS 300'},
yrst:{n:'YRST — Salvage Craft Tender',b:'USN',c:'svc',p:'PMS 300'},
yfnb:{n:'YFNB — Large Covered Lighter',b:'USN',c:'svc',p:'PMS 300'},
yfnx:{n:'YFNX — Special Purpose Lighter',b:'USN',c:'svc',p:'PMS 300'},
ysd:{n:'YSD — Seaplane Wrecking Derrick',b:'USN',c:'svc',p:'PMS 300'},
ylc:{n:'YLC — Salvage Lift Craft',b:'USN',c:'svc',p:'PMS 300'},
ywo:{n:'YWO — Yard Water Oiler',b:'USN',c:'svc',p:'PMS 300'},
yfrt:{n:'YFRT — Refrigerated Covered Lighter',b:'USN',c:'svc',p:'PMS 300'},
yrb:{n:'YRB — Repair & Berthing Barge',b:'USN',c:'svc',p:'PMS 300'},
ydcl:{n:'YDCL — Diving Craft Lighter',b:'USN',c:'svc',p:'PMS 300'},
yfndt:{n:'YFN(DT) — Diving Tender Lighter',b:'USN',c:'svc',p:'PMS 300'},
// ──── U.S. NAVY — AIRCRAFT CARRIERS ────
cvn68:{n:'CVN-68 Nimitz-class Carrier',b:'USN',c:'cv',p:'PMS 312'},
cvn68_rcoh:{n:'CVN-68 Nimitz-class RCOH',b:'USN',c:'cv',p:'PMS 312'},
cvn78:{n:'CVN-78 Gerald R. Ford-class',b:'USN',c:'cv',p:'PMS 378'},
cvn79:{n:'CVN-79 John F. Kennedy',b:'USN',c:'cv',p:'PMS 378'},
cvn80:{n:'CVN-80 Enterprise',b:'USN',c:'cv',p:'PMS 378'},
cvn81:{n:'CVN-81 Doris Miller',b:'USN',c:'cv',p:'PMS 378'},
// ──── U.S. NAVY — SURFACE COMBATANTS ────
ddg51:{n:'DDG-51 Arleigh Burke-class (Flight I/II)',b:'USN',c:'sc',p:'PMS 400D'},
ddg51_fltIIA:{n:'DDG-51 Arleigh Burke-class (Flight IIA)',b:'USN',c:'sc',p:'PMS 400D'},
ddg51_fltIII:{n:'DDG-51 Arleigh Burke-class (Flight III)',b:'USN',c:'sc',p:'PMS 400D'},
ddg1000:{n:'DDG-1000 Zumwalt-class',b:'USN',c:'sc',p:'PMS 500'},
cg47:{n:'CG-47 Ticonderoga-class Cruiser',b:'USN',c:'sc',p:'PMS 400C'},
ffg62:{n:'FFG-62 Constellation-class Frigate',b:'USN',c:'sc',p:'PMS 515'},
lcs1:{n:'LCS-1 Freedom-class (Odd Hulls)',b:'USN',c:'sc',p:'PMS 501'},
lcs2:{n:'LCS-2 Independence-class (Even Hulls)',b:'USN',c:'sc',p:'PMS 501'},
ddg_next:{n:'DDG(X) Next-Gen Destroyer',b:'USN',c:'sc',p:'PMS 400D'},
// ──── U.S. NAVY — SUBMARINES ────
ssn774:{n:'SSN-774 Virginia-class (Block I–IV)',b:'USN',c:'sub',p:'PMS 450'},
ssn774_blkv:{n:'SSN-774 Virginia-class (Block V VPM)',b:'USN',c:'sub',p:'PMS 450'},
ssn21:{n:'SSN-21 Seawolf-class',b:'USN',c:'sub',p:'PMS 350'},
ssn688:{n:'SSN-688 Los Angeles-class',b:'USN',c:'sub',p:'PMS 392'},
ssbn726:{n:'SSBN-726 Ohio-class (SSBN)',b:'USN',c:'sub',p:'PMS 396'},
ssgn726:{n:'SSGN-726 Ohio-class (SSGN Conversion)',b:'USN',c:'sub',p:'PMS 396'},
ssbn826:{n:'SSBN-826 Columbia-class',b:'USN',c:'sub',p:'PMS 397'},
// ──── U.S. NAVY — AMPHIBIOUS WARFARE ────
lha6:{n:'LHA-6 America-class (Flight 0)',b:'USN',c:'amph',p:'PMS 377'},
lha8:{n:'LHA-8 America-class (Flight 1)',b:'USN',c:'amph',p:'PMS 377'},
lhd1:{n:'LHD-1 Wasp-class',b:'USN',c:'amph',p:'PMS 377'},
lpd17:{n:'LPD-17 San Antonio-class',b:'USN',c:'amph',p:'PMS 317'},
lpd17_flt2:{n:'LPD-17 Flight II San Antonio-class',b:'USN',c:'amph',p:'PMS 317'},
lsd41:{n:'LSD-41 Whidbey Island-class',b:'USN',c:'amph',p:'PMS 377'},
lsd49:{n:'LSD-49 Harpers Ferry-class',b:'USN',c:'amph',p:'PMS 377'},
epf:{n:'EPF Spearhead-class (Expeditionary Fast Transport)',b:'USN',c:'amph',p:'PMS 385'},
esb:{n:'ESB Lewis B. Puller-class (Expeditionary Sea Base)',b:'USN',c:'amph',p:'PMS 385'},
esd:{n:'ESD Montford Point-class (Expeditionary Transfer Dock)',b:'USN',c:'amph',p:'PMS 385'},
lsm:{n:'LSM Medium Landing Ship (New Construction)',b:'USN',c:'amph',p:'PMS 377'},
lcc19:{n:'LCC-19 Blue Ridge-class Command Ship',b:'USN',c:'amph',p:'PMS 377'},
// ──── U.S. NAVY — MINE WARFARE ────
mcm1:{n:'MCM-1 Avenger-class Mine Countermeasures',b:'USN',c:'mine',p:'PMS 302'},
mhc51:{n:'MHC-51 Osprey-class Coastal Minehunter',b:'USN',c:'mine',p:'PMS 302'},
lcs_mcm:{n:'LCS Mine Countermeasures Mission Package',b:'USN',c:'mine',p:'PMS 420'},
// ──── U.S. NAVY — PATROL & COASTAL ────
pc1:{n:'PC-1 Cyclone-class Patrol Craft',b:'USN',c:'pat',p:'PMS 325'},
mkvi_pb:{n:'Mark VI Patrol Boat',b:'USN',c:'pat',p:'PMS 325'},
mkv_soc:{n:'Mark V Special Operations Craft',b:'USN',c:'pat',p:'NSW'},
// ──── U.S. NAVY — AUXILIARY & LOGISTICS ────
tao205:{n:'T-AO-205 John Lewis-class Fleet Oiler',b:'USN',c:'aux',p:'PMS 325'},
take1:{n:'T-AKE Lewis & Clark-class Dry Cargo/Ammo',b:'USN',c:'aux',p:'PMS 325'},
taoe6:{n:'T-AOE-6 Supply-class Fast Combat Support',b:'USN',c:'aux',p:'PMS 325'},
tah19:{n:'T-AH-19 Mercy-class Hospital Ship',b:'USN',c:'aux',p:'PMS 325'},
tagos:{n:'T-AGOS Ocean Surveillance Ship',b:'USN',c:'aux',p:'PMS 325'},
as39:{n:'AS-39 Emory S. Land-class Submarine Tender',b:'USN',c:'aux',p:'PMS 325'},
tavb:{n:'T-AVB Aviation Logistics Support Ship',b:'USN',c:'aux',p:'PMS 325'},
tao187:{n:'T-AO-187 Henry J. Kaiser-class Oiler',b:'USN',c:'aux',p:'PMS 325'},
tatf:{n:'T-ATF Powhatan-class Fleet Tug',b:'USN',c:'aux',p:'PMS 325'},
tarc:{n:'T-ARC Cable Laying/Repair Ship',b:'USN',c:'aux',p:'PMS 325'},
taks:{n:'T-AKS Cargo Ship (Ammunition)',b:'USN',c:'aux',p:'PMS 325'},
aoe6:{n:'AOE-6 Supply-class (Active Navy)',b:'USN',c:'aux',p:'PMS 325'},
// ──── U.S. NAVY — NAVAL AVIATION (FIXED-WING) ────
fa18e:{n:'F/A-18E Super Hornet (Single Seat)',b:'USN',c:'nair',p:'PMA-265'},
fa18f:{n:'F/A-18F Super Hornet (Two Seat)',b:'USN',c:'nair',p:'PMA-265'},
f35c:{n:'F-35C Lightning II (CV Variant)',b:'USN',c:'nair',p:'PMA-265'},
ea18g:{n:'EA-18G Growler (Electronic Attack)',b:'USN',c:'nair',p:'PMA-234'},
e2c:{n:'E-2C Hawkeye (AEW&C)',b:'USN',c:'nair',p:'PMA-231'},
e2d:{n:'E-2D Advanced Hawkeye',b:'USN',c:'nair',p:'PMA-231'},
p8a:{n:'P-8A Poseidon (MPA)',b:'USN',c:'nair',p:'PMA-290'},
p3c:{n:'P-3C Orion (Legacy MPA)',b:'USN',c:'nair',p:'PMA-290'},
c2a:{n:'C-2A Greyhound (Legacy COD)',b:'USN',c:'nair',p:'PMA-231'},
cmv22b:{n:'CMV-22B Osprey (Carrier Onboard Delivery)',b:'USN',c:'nair',p:'PMA-275'},
c40a:{n:'C-40A Clipper (Logistics)',b:'USN',c:'nair',p:'PMA-290'},
c130t:{n:'C-130T Hercules (Fleet Logistics)',b:'USN',c:'nair',p:'PMA-207'},
t6b:{n:'T-6B Texan II (Primary Trainer)',b:'USN',c:'nair',p:'PMA-273'},
t45c:{n:'T-45C Goshawk (Jet Trainer)',b:'USN',c:'nair',p:'PMA-273'},
th73a:{n:'TH-73A Thrasher (Helo Trainer)',b:'USN',c:'nair',p:'PMA-273'},
ep3e:{n:'EP-3E Aries II (SIGINT)',b:'USN',c:'nair',p:'PMA-290'},
c26d:{n:'C-26D Metro (Utility)',b:'USN',c:'nair',p:'PMA-290'},
e6b:{n:'E-6B Mercury (TACAMO)',b:'USN',c:'nair',p:'PMA-271'},
// ──── U.S. NAVY — NAVAL AVIATION (ROTARY-WING) ────
mh60r:{n:'MH-60R Seahawk (Maritime Strike)',b:'USN',c:'nhelo',p:'PMA-299'},
mh60s:{n:'MH-60S Seahawk (Sea Combat)',b:'USN',c:'nhelo',p:'PMA-299'},
mh53e:{n:'MH-53E Sea Dragon (Airborne MCM)',b:'USN',c:'nhelo',p:'PMA-261'},
ch53k:{n:'CH-53K King Stallion (Heavy Lift)',b:'USN',c:'nhelo',p:'PMA-261'},
sh60b:{n:'SH-60B Seahawk (Legacy)',b:'USN',c:'nhelo',p:'PMA-299'},
hh60h:{n:'HH-60H Rescue Hawk',b:'USN',c:'nhelo',p:'PMA-299'},
// ──── U.S. NAVY — NAVAL UAVs & UAS ────
mq4c:{n:'MQ-4C Triton (BAMS UAS)',b:'USN',c:'nuav',p:'PMA-262'},
mq8b:{n:'MQ-8B Fire Scout (VTUAV)',b:'USN',c:'nuav',p:'PMA-266'},
mq8c:{n:'MQ-8C Fire Scout (Upgraded)',b:'USN',c:'nuav',p:'PMA-266'},
mq25:{n:'MQ-25 Stingray (Carrier-Based Tanker UAS)',b:'USN',c:'nuav',p:'PMA-268'},
scan_eagle:{n:'RQ-21A Integrator / ScanEagle',b:'USN',c:'nuav',p:'PMA-263'},
// ──── U.S. NAVY — SMALL BOATS & UNMANNED SURFACE/SUBSURFACE ────
rhib11m:{n:'RHIB 11-Meter (Rigid Hull Inflatable)',b:'USN',c:'nsb',p:'PMS 325'},
lcac:{n:'LCAC Landing Craft Air Cushion',b:'USN',c:'nsb',p:'PMS 377'},
ssc:{n:'SSC Ship-to-Shore Connector (LCAC 100)',b:'USN',c:'nsb',p:'PMS 377'},
lcu1700:{n:'LCU-1700 Runnymede-class Landing Craft',b:'USN',c:'nsb',p:'PMS 377'},
surc:{n:'SURC Small Unit Riverine Craft',b:'USN',c:'nsb',p:'NSW'},
crrc:{n:'CRRC Combat Rubber Raiding Craft',b:'USN',c:'nsb',p:'NSW'},
musv:{n:'MUSV Medium Unmanned Surface Vessel',b:'USN',c:'nsb',p:'PMS 406'},
lusv:{n:'LUSV Large Unmanned Surface Vessel',b:'USN',c:'nsb',p:'PMS 406'},
orca_xluuv:{n:'Orca XLUUV (Extra-Large UUV)',b:'USN',c:'nsb',p:'PMS 406'},
snakehead:{n:'Snakehead LDUUV (Large Displacement UUV)',b:'USN',c:'nsb',p:'PMS 406'},
razorback_usv:{n:'GARC Global Autonomous Recon Craft',b:'USN',c:'nsb',p:'PMS 406'},
knifefish:{n:'Knifefish UUV (Mine Countermeasures)',b:'USN',c:'nsb',p:'PMS 420'},
sdv:{n:'SDV SEAL Delivery Vehicle',b:'USN',c:'nsb',p:'NSW'},
swcc_soc:{n:'SOC-R Special Ops Craft – Riverine',b:'USN',c:'nsb',p:'NSW'},
// ──── U.S. NAVY — NAVAL WEAPONS & MUNITIONS ────
bgm109:{n:'BGM-109 Tomahawk Cruise Missile',b:'USN',c:'nwpn',p:'PMA-280'},
agm84:{n:'AGM-84 Harpoon Anti-Ship Missile',b:'USN',c:'nwpn',p:'PMA-201'},
agm158c:{n:'AGM-158C LRASM (Long Range Anti-Ship)',b:'USN',c:'nwpn',p:'PMA-201'},
nsm_usn:{n:'NSM Naval Strike Missile',b:'USN',c:'nwpn',p:'PMA-201'},
sm2:{n:'SM-2 Standard Missile (RIM-66/67)',b:'USN',c:'nwpn',p:'PMA-280'},
sm3:{n:'SM-3 Standard Missile (RIM-161)',b:'USN',c:'nwpn',p:'MDA'},
sm6:{n:'SM-6 Standard Missile (RIM-174)',b:'USN',c:'nwpn',p:'PMA-280'},
essm:{n:'ESSM Evolved Sea Sparrow (RIM-162)',b:'USN',c:'nwpn',p:'PMA-280'},
rim116:{n:'RIM-116 Rolling Airframe Missile',b:'USN',c:'nwpn',p:'PMA-280'},
mk48:{n:'Mk 48 ADCAP Heavyweight Torpedo',b:'USN',c:'nwpn',p:'PMS 404'},
mk54:{n:'Mk 54 Lightweight Torpedo',b:'USN',c:'nwpn',p:'PMS 404'},
mk46_torp:{n:'Mk 46 Lightweight Torpedo (Legacy)',b:'USN',c:'nwpn',p:'PMS 404'},
cwis_blk1b:{n:'CIWS Phalanx Block 1B',b:'USN',c:'nwpn',p:'PMS 400D'},
mk45_gun:{n:'Mk 45 Mod 4 5-inch/62 Gun System',b:'USN',c:'nwpn',p:'PMS 400D'},
mk110_57mm:{n:'Mk 110 57mm Gun System',b:'USN',c:'nwpn',p:'PMS 400D'},
mk38_25mm:{n:'Mk 38 Mod 2 25mm Machine Gun System',b:'USN',c:'nwpn',p:'PMS 400D'},
mk41_vls:{n:'Mk 41 Vertical Launching System',b:'USN',c:'nwpn',p:'PMS 400D'},
mk57_pvls:{n:'Mk 57 Peripheral VLS (DDG-1000)',b:'USN',c:'nwpn',p:'PMS 500'},
searam:{n:'SeaRAM Block 2',b:'USN',c:'nwpn',p:'PMS 400D'},
helios_hel:{n:'HELIOS High Energy Laser (60 kW)',b:'USN',c:'nwpn',p:'PMS 405'},
odin_laser:{n:'ODIN Optical Dazzling Interdictor',b:'USN',c:'nwpn',p:'PMS 405'},

// ──── U.S. MARINE CORPS — GROUND COMBAT VEHICLES ────
acv:{n:'ACV 1.1 Amphibious Combat Vehicle',b:'USMC',c:'mgnd',p:'PEO LS / PM AAA'},
acv_30mm:{n:'ACV-30 (30mm Turret Variant)',b:'USMC',c:'mgnd',p:'PEO LS'},
aav7:{n:'AAV-7A1 Assault Amphibious Vehicle',b:'USMC',c:'mgnd',p:'PEO LS'},
aav7_surv:{n:'AAV-7A1 SurvivAbility Upgrade (SUP)',b:'USMC',c:'mgnd',p:'PEO LS'},
lav25:{n:'LAV-25 Light Armored Vehicle',b:'USMC',c:'mgnd',p:'PEO LS'},
lav_at:{n:'LAV-AT (Anti-Tank TOW Variant)',b:'USMC',c:'mgnd',p:'PEO LS'},
lav_c2:{n:'LAV-C2 (Command & Control Variant)',b:'USMC',c:'mgnd',p:'PEO LS'},
m1a1_fep:{n:'M1A1 FEP Abrams (USMC)',b:'USMC',c:'mgnd',p:'PEO LS'},
jltv_usmc:{n:'JLTV Oshkosh L-ATV (USMC)',b:'USMC',c:'mgnd',p:'PEO LS / PM JLTV'},
mtvr:{n:'MTVR 7-Ton Medium Tactical Vehicle',b:'USMC',c:'mgnd',p:'PEO LS'},
lvsr:{n:'LVSR Logistics Vehicle System Replacement',b:'USMC',c:'mgnd',p:'PEO LS'},
m777a2_usmc:{n:'M777A2 155mm Lightweight Howitzer (USMC)',b:'USMC',c:'mgnd',p:'PEO LS'},
m120_mortar_usmc:{n:'M120 120mm Mortar System (USMC)',b:'USMC',c:'mgnd',p:'PEO LS'},
hmmwv_usmc:{n:'HMMWV M1165/M1167 (USMC)',b:'USMC',c:'mgnd',p:'PEO LS'},
mrzr:{n:'MRZR Tactical All-Terrain Vehicle',b:'USMC',c:'mgnd',p:'MARCORSYSCOM'},
ifav:{n:'IFAV Interim Fast Attack Vehicle',b:'USMC',c:'mgnd',p:'MARCORSYSCOM'},
nmesis:{n:'NMESIS Navy-Marine Expeditionary Ship Interdiction System',b:'USMC',c:'mgnd',p:'MARCORSYSCOM'},
rogue_fires:{n:'Rogue Fires Autonomous Anti-Ship System',b:'USMC',c:'mgnd',p:'MARCORSYSCOM'},
// ──── U.S. MARINE CORPS — AVIATION ────
f35b:{n:'F-35B Lightning II (STOVL)',b:'USMC',c:'mav',p:'PMA-265 / JSF'},
av8b:{n:'AV-8B Harrier II+ (Retiring)',b:'USMC',c:'mav',p:'PMA-257'},
mv22b:{n:'MV-22B Osprey (Assault Support)',b:'USMC',c:'mav',p:'PMA-275'},
ah1z:{n:'AH-1Z Viper (Attack Helicopter)',b:'USMC',c:'mav',p:'PMA-276'},
uh1y:{n:'UH-1Y Venom (Utility Helicopter)',b:'USMC',c:'mav',p:'PMA-276'},
ch53e:{n:'CH-53E Super Stallion (Heavy Lift)',b:'USMC',c:'mav',p:'PMA-261'},
ch53k_usmc:{n:'CH-53K King Stallion (USMC)',b:'USMC',c:'mav',p:'PMA-261'},
kc130j_usmc:{n:'KC-130J Super Hercules (USMC)',b:'USMC',c:'mav',p:'PMA-207'},
mq9_usmc:{n:'MQ-9A Reaper (USMC MUX Interim)',b:'USMC',c:'mav',p:'PMA-263'},
rq21_usmc:{n:'RQ-21A Blackjack (Small Tactical UAS)',b:'USMC',c:'mav',p:'PMA-263'},
rq7b_usmc:{n:'RQ-7B Shadow (Tactical UAS)',b:'USMC',c:'mav',p:'PMA-263'},
// ──── U.S. MARINE CORPS — C4ISR & SENSORS ────
gator_tps80:{n:'AN/TPS-80 G/ATOR (Ground/Air Radar)',b:'USMC',c:'mc4',p:'PEO LS'},
cec_usmc:{n:'CEC Cooperative Engagement Capability (USMC)',b:'USMC',c:'mc4',p:'PEO C4'},
madis:{n:'MADIS Marine Air Defense Integrated System',b:'USMC',c:'mc4',p:'MARCORSYSCOM'},
lmadis:{n:'LMADIS Light MADIS (C-UAS)',b:'USMC',c:'mc4',p:'MARCORSYSCOM'},
magtf_c2:{n:'MAGTF Joint C2 System',b:'USMC',c:'mc4',p:'PEO C4'},
notm:{n:'NOTM Network On-The-Move',b:'USMC',c:'mc4',p:'PEO C4'},

// ──── U.S. ARMY — ARMOR & MAIN BATTLE TANKS ────
m1a2_sepv3:{n:'M1A2 SEPv3 Abrams Main Battle Tank',b:'USA',c:'tank',p:'PEO GCS / PM HBCT'},
m1a2_sepv4:{n:'M1A2 SEPv4 Abrams (Planned)',b:'USA',c:'tank',p:'PEO GCS'},
m1a1_sa:{n:'M1A1 SA Abrams (Situational Awareness)',b:'USA',c:'tank',p:'PEO GCS'},
m1_aim:{n:'M1A1 AIM (Abrams Integrated Management)',b:'USA',c:'tank',p:'PEO GCS'},
m1150_abv:{n:'M1150 Assault Breacher Vehicle',b:'USA',c:'tank',p:'PEO GCS'},
m104_wolverine:{n:'M104 Wolverine Heavy Assault Bridge',b:'USA',c:'tank',p:'PEO CS&CSS'},
m10_booker:{n:'M10 Booker Mobile Protected Firepower',b:'USA',c:'tank',p:'PEO GCS'},
// ──── U.S. ARMY — INFANTRY FIGHTING & COMBAT VEHICLES ────
m2a3_bradley:{n:'M2A3 Bradley IFV',b:'USA',c:'ifv',p:'PEO GCS / PM HBCT'},
m2a4_bradley:{n:'M2A4 Bradley IFV (ECP)',b:'USA',c:'ifv',p:'PEO GCS'},
m3a3_bradley:{n:'M3A3 Bradley CFV (Cavalry)',b:'USA',c:'ifv',p:'PEO GCS'},
stryker:{n:'Stryker ICV-VA1 (Infantry Carrier)',b:'USA',c:'ifv',p:'PEO GCS / PM SBCT'},
stryker_dragoon:{n:'Stryker A1 Dragoon (30mm)',b:'USA',c:'ifv',p:'PEO GCS'},
stryker_msl:{n:'Stryker M-SHORAD (Air Defense Variant)',b:'USA',c:'ifv',p:'PEO GCS'},
stryker_mcws:{n:'Stryker MCWS (Medium Caliber Weapons)',b:'USA',c:'ifv',p:'PEO GCS'},
stryker_atgm:{n:'Stryker ATGM (Anti-Tank Guided Missile)',b:'USA',c:'ifv',p:'PEO GCS'},
stryker_mortar:{n:'Stryker M1129 Mortar Carrier',b:'USA',c:'ifv',p:'PEO GCS'},
stryker_recon:{n:'Stryker M1127 RV (Reconnaissance)',b:'USA',c:'ifv',p:'PEO GCS'},
stryker_nbc:{n:'Stryker M1135 NBCRV',b:'USA',c:'ifv',p:'PEO GCS'},
stryker_esv:{n:'Stryker M1132 ESV (Engineer)',b:'USA',c:'ifv',p:'PEO GCS'},
stryker_cmd:{n:'Stryker M1130 CV (Commander)',b:'USA',c:'ifv',p:'PEO GCS'},
stryker_med:{n:'Stryker M1133 MEV (Medical)',b:'USA',c:'ifv',p:'PEO GCS'},
ampv:{n:'AMPV Armored Multi-Purpose Vehicle',b:'USA',c:'ifv',p:'PEO GCS'},
ampv_gpc:{n:'AMPV General Purpose Carrier',b:'USA',c:'ifv',p:'PEO GCS'},
ampv_mc:{n:'AMPV Mission Command',b:'USA',c:'ifv',p:'PEO GCS'},
ampv_med:{n:'AMPV Medical Treatment',b:'USA',c:'ifv',p:'PEO GCS'},
ampv_mortar:{n:'AMPV Mortar Carrier',b:'USA',c:'ifv',p:'PEO GCS'},
m113:{n:'M113 Armored Personnel Carrier (Legacy)',b:'USA',c:'ifv',p:'PEO GCS'},
xm30_omfv:{n:'XM30 OMFV (Optionally Manned Fighting Vehicle)',b:'USA',c:'ifv',p:'PEO GCS'},
// ──── U.S. ARMY — ARTILLERY & FIRES ────
m142_himars:{n:'M142 HIMARS (High Mobility Artillery Rocket System)',b:'USA',c:'arty',p:'PEO M&S'},
m270a2:{n:'M270A2 MLRS (Multiple Launch Rocket System)',b:'USA',c:'arty',p:'PEO M&S'},
m109a7:{n:'M109A7 Paladin Self-Propelled Howitzer',b:'USA',c:'arty',p:'PEO GCS'},
m109a8_erca:{n:'M109A8 ERCA Extended Range Cannon Artillery',b:'USA',c:'arty',p:'PEO GCS'},
m777a2:{n:'M777A2 155mm Towed Howitzer',b:'USA',c:'arty',p:'PEO CS&CSS'},
m119a3:{n:'M119A3 105mm Towed Howitzer',b:'USA',c:'arty',p:'PEO CS&CSS'},
m120_mortar:{n:'M120/M121 120mm Mortar System',b:'USA',c:'arty',p:'PEO CS&CSS'},
m252_mortar:{n:'M252 81mm Mortar',b:'USA',c:'arty',p:'PEO CS&CSS'},
gmlrs:{n:'GMLRS Guided Multiple Launch Rocket System',b:'USA',c:'arty',p:'PEO M&S'},
gmlrs_er:{n:'GMLRS-ER Extended Range Rocket',b:'USA',c:'arty',p:'PEO M&S'},
atacms:{n:'ATACMS (Army Tactical Missile System)',b:'USA',c:'arty',p:'PEO M&S'},
prsm:{n:'PrSM Precision Strike Missile',b:'USA',c:'arty',p:'PEO M&S'},
sm_hypersonic:{n:'LRHW Dark Eagle Hypersonic Weapon',b:'USA',c:'arty',p:'PEO M&S'},
typhon:{n:'Typhon Mid-Range Capability Launcher',b:'USA',c:'arty',p:'PEO M&S'},
// ──── U.S. ARMY — TACTICAL & SUPPORT VEHICLES ────
jltv:{n:'JLTV Oshkosh L-ATV (Joint Light Tactical Vehicle)',b:'USA',c:'tac',p:'PEO CS&CSS / PM TV'},
fmtv_m1078:{n:'FMTV M1078 2.5-Ton LMTV',b:'USA',c:'tac',p:'PEO CS&CSS'},
fmtv_m1083:{n:'FMTV M1083 5-Ton MTV',b:'USA',c:'tac',p:'PEO CS&CSS'},
fmtv_m1084:{n:'FMTV M1084 5-Ton MTV w/ MHE',b:'USA',c:'tac',p:'PEO CS&CSS'},
matv:{n:'M-ATV (MRAP All-Terrain Vehicle)',b:'USA',c:'tac',p:'PEO CS&CSS'},
maxxpro:{n:'MaxxPro (MRAP)',b:'USA',c:'tac',p:'PEO CS&CSS'},
hemtt:{n:'HEMTT M977 Heavy Expanded Mobility Tactical Truck',b:'USA',c:'tac',p:'PEO CS&CSS'},
hemtt_a4:{n:'HEMTT A4 w/ PLS Common Bridge',b:'USA',c:'tac',p:'PEO CS&CSS'},
pls:{n:'PLS M1075 Palletized Load System',b:'USA',c:'tac',p:'PEO CS&CSS'},
m1070_het:{n:'M1070 Heavy Equipment Transporter',b:'USA',c:'tac',p:'PEO CS&CSS'},
m915:{n:'M915 Line Haul Tractor',b:'USA',c:'tac',p:'PEO CS&CSS'},
m978_tanker:{n:'M978 HEMTT Fuel Tanker',b:'USA',c:'tac',p:'PEO CS&CSS'},
hmmwv_army:{n:'HMMWV M1151/M1165 Up-Armored (Army)',b:'USA',c:'tac',p:'PEO CS&CSS'},
isv:{n:'ISV Infantry Squad Vehicle (GM Defense)',b:'USA',c:'tac',p:'PEO CS&CSS'},
catv:{n:'CATV Cold Weather All-Terrain Vehicle',b:'USA',c:'tac',p:'PEO CS&CSS'},
// ──── U.S. ARMY — AVIATION ────
ah64e:{n:'AH-64E Apache Guardian (Attack)',b:'USA',c:'aav',p:'PEO Aviation / PM Apache'},
ah64d:{n:'AH-64D Apache Longbow',b:'USA',c:'aav',p:'PEO Aviation'},
uh60m:{n:'UH-60M Black Hawk (Utility)',b:'USA',c:'aav',p:'PEO Aviation / PM UAS'},
uh60l:{n:'UH-60L Black Hawk (Legacy)',b:'USA',c:'aav',p:'PEO Aviation'},
uh60v:{n:'UH-60V Black Hawk (Digital Upgrade)',b:'USA',c:'aav',p:'PEO Aviation'},
ch47f:{n:'CH-47F Chinook (Cargo/Heavy Lift)',b:'USA',c:'aav',p:'PEO Aviation / PM Cargo'},
ch47f_blk2:{n:'CH-47F Block II Chinook',b:'USA',c:'aav',p:'PEO Aviation'},
v280_valor:{n:'V-280 Valor FLRAA (Future Long-Range Assault)',b:'USA',c:'aav',p:'PEO Aviation'},
mq1c:{n:'MQ-1C Gray Eagle Extended Range UAS',b:'USA',c:'aav',p:'PEO Aviation / PM UAS'},
rq7b:{n:'RQ-7B Shadow Tactical UAS',b:'USA',c:'aav',p:'PEO Aviation'},
rq11b:{n:'RQ-11B Raven Small UAS',b:'USA',c:'aav',p:'PEO Aviation'},
rq20:{n:'RQ-20A/B Puma AE Small UAS',b:'USA',c:'aav',p:'PEO Aviation'},
uh72a:{n:'UH-72A Lakota (Light Utility)',b:'USA',c:'aav',p:'PEO Aviation'},
rc12_guardrail:{n:'RC-12X Guardrail (SIGINT)',b:'USA',c:'aav',p:'PEO IEW&S'},
c12_huron:{n:'C-12 Huron (Transport)',b:'USA',c:'aav',p:'PEO Aviation'},
emarss:{n:'EMARSS Enhanced MARSS (Surveillance)',b:'USA',c:'aav',p:'PEO IEW&S'},
ftuas:{n:'FTUAS Future Tactical UAS',b:'USA',c:'aav',p:'PEO Aviation'},
altius600:{n:'ALTIUS-600 Launched Effect',b:'USA',c:'aav',p:'PEO Aviation'},
// ──── U.S. ARMY — AIR & MISSILE DEFENSE ────
patriot:{n:'MIM-104 Patriot PAC-3 (Air Defense)',b:'USA',c:'ada',p:'PEO M&S'},
patriot_pac2:{n:'MIM-104 Patriot PAC-2 GEM+',b:'USA',c:'ada',p:'PEO M&S'},
thaad:{n:'THAAD Terminal High Altitude Area Defense',b:'USA',c:'ada',p:'MDA / PEO M&S'},
avenger:{n:'AN/TWQ-1 Avenger (Short-Range AD)',b:'USA',c:'ada',p:'PEO M&S'},
im_shorad:{n:'IM-SHORAD (Stryker-Based Air Defense)',b:'USA',c:'ada',p:'PEO M&S'},
de_mshorad:{n:'DE M-SHORAD (Directed Energy)',b:'USA',c:'ada',p:'PEO M&S'},
sentinel_a4:{n:'AN/MPQ-64 Sentinel A4 Radar',b:'USA',c:'ada',p:'PEO M&S'},
ltamds:{n:'LTAMDS (Lower Tier Air & Missile Defense Sensor)',b:'USA',c:'ada',p:'PEO M&S'},
ibcs:{n:'IBCS Integrated Battle Command System',b:'USA',c:'ada',p:'PEO M&S'},
cram:{n:'C-RAM Counter Rocket Artillery Mortar',b:'USA',c:'ada',p:'PEO M&S'},
iron_dome_us:{n:'Iron Dome (U.S. Interim SHORAD)',b:'USA',c:'ada',p:'PEO M&S'},
ifpc:{n:'IFPC Indirect Fire Protection Capability',b:'USA',c:'ada',p:'PEO M&S'},
nasams:{n:'NASAMS (National Advanced SAM System)',b:'USA',c:'ada',p:'PEO M&S'},
enduring_shield:{n:'Enduring Shield (IFPC-HEL)',b:'USA',c:'ada',p:'PEO M&S'},
// ──── U.S. ARMY — C4ISR & EW ────
tpq36:{n:'AN/TPQ-36 Firefinder Radar',b:'USA',c:'ac4',p:'PEO IEW&S'},
tpq53:{n:'AN/TPQ-53 Counterfire Target Acquisition Radar',b:'USA',c:'ac4',p:'PEO IEW&S'},
dcgs_a:{n:'DCGS-A Distributed Common Ground System',b:'USA',c:'ac4',p:'PEO IEW&S'},
win_t:{n:'WIN-T Warfighter Information Network - Tactical',b:'USA',c:'ac4',p:'PEO C3T'},
cpof:{n:'CPOF Command Post of the Future',b:'USA',c:'ac4',p:'PEO C3T'},
prophet:{n:'AN/MLQ-44 Prophet (Ground SIGINT)',b:'USA',c:'ac4',p:'PEO IEW&S'},
ewpmt:{n:'EWPMT Electronic Warfare Planning & Management Tool',b:'USA',c:'ac4',p:'PEO IEW&S'},
tls_jamming:{n:'TLS-EAB Terrestrial Layer System',b:'USA',c:'ac4',p:'PEO IEW&S'},
mfew:{n:'MFEW Multi-Function EW System',b:'USA',c:'ac4',p:'PEO IEW&S'},
titan:{n:'TITAN Tactical Intelligence Targeting Access Node',b:'USA',c:'ac4',p:'PEO IEW&S'},
// ──── U.S. ARMY — ENGINEER EQUIPMENT ────
m9_ace:{n:'M9 ACE Armored Combat Earthmover',b:'USA',c:'aeng',p:'PEO CS&CSS'},
jab:{n:'JAB Joint Assault Bridge',b:'USA',c:'aeng',p:'PEO CS&CSS'},
avlb:{n:'AVLB Armored Vehicle Launched Bridge',b:'USA',c:'aeng',p:'PEO CS&CSS'},
m58_wolf:{n:'M58 MICLIC Mine Clearing Line Charge',b:'USA',c:'aeng',p:'PEO CS&CSS'},
m160_robot:{n:'M160 Robotic Mine Flail',b:'USA',c:'aeng',p:'PEO CS&CSS'},
d7_dozer:{n:'D7 Armored Dozer',b:'USA',c:'aeng',p:'PEO CS&CSS'},
hyster_forklift:{n:'10K RT Rough Terrain Forklift',b:'USA',c:'aeng',p:'PEO CS&CSS'},
tcm_crane:{n:'TCM-20 All-Terrain Crane',b:'USA',c:'aeng',p:'PEO CS&CSS'},

// ──── U.S. AIR FORCE — FIGHTERS & ATTACK ────
f35a:{n:'F-35A Lightning II (CTOL)',b:'USAF',c:'ftr',p:'F-35 JPO'},
f22a:{n:'F-22A Raptor',b:'USAF',c:'ftr',p:'PEO Fighters & Advanced'},
f15ex:{n:'F-15EX Eagle II',b:'USAF',c:'ftr',p:'PEO Fighters & Advanced'},
f15e:{n:'F-15E Strike Eagle',b:'USAF',c:'ftr',p:'PEO Fighters & Advanced'},
f15c:{n:'F-15C/D Eagle (Legacy)',b:'USAF',c:'ftr',p:'PEO Fighters & Advanced'},
f16c:{n:'F-16C/D Fighting Falcon (Block 40/50)',b:'USAF',c:'ftr',p:'PEO Fighters & Advanced'},
f16_blk70:{n:'F-16 Block 70/72 Viper (Export/Upgrade)',b:'USAF',c:'ftr',p:'PEO Fighters & Advanced'},
a10c:{n:'A-10C Thunderbolt II (Warthog)',b:'USAF',c:'ftr',p:'PEO Fighters & Advanced'},
ngad:{n:'NGAD Next Generation Air Dominance',b:'USAF',c:'ftr',p:'PEO Fighters & Advanced'},
cca:{n:'CCA Collaborative Combat Aircraft',b:'USAF',c:'ftr',p:'PEO Fighters & Advanced'},
// ──── U.S. AIR FORCE — BOMBERS ────
b21:{n:'B-21 Raider (Stealth Bomber)',b:'USAF',c:'bmr',p:'AFLCMC / B-21 SPO'},
b1b:{n:'B-1B Lancer',b:'USAF',c:'bmr',p:'AFLCMC'},
b2a:{n:'B-2A Spirit (Stealth Bomber)',b:'USAF',c:'bmr',p:'AFLCMC'},
b52h:{n:'B-52H Stratofortress',b:'USAF',c:'bmr',p:'AFLCMC / B-52 SPO'},
b52_reengine:{n:'B-52H CERP (Commercial Engine Replacement)',b:'USAF',c:'bmr',p:'AFLCMC'},
// ──── U.S. AIR FORCE — TANKER & TRANSPORT ────
kc46a:{n:'KC-46A Pegasus (Aerial Refueling)',b:'USAF',c:'ttpt',p:'AFLCMC / KC-46 SPO'},
kc135r:{n:'KC-135R Stratotanker',b:'USAF',c:'ttpt',p:'AFLCMC'},
kc10a:{n:'KC-10A Extender (Retiring)',b:'USAF',c:'ttpt',p:'AFLCMC'},
c17:{n:'C-17A Globemaster III',b:'USAF',c:'ttpt',p:'AFLCMC / C-17 SPO'},
c5m:{n:'C-5M Super Galaxy',b:'USAF',c:'ttpt',p:'AFLCMC'},
c130j:{n:'C-130J Super Hercules',b:'USAF',c:'ttpt',p:'AFLCMC / C-130 SPO'},
c130h:{n:'C-130H Hercules (Legacy)',b:'USAF',c:'ttpt',p:'AFLCMC'},
c40b:{n:'C-40B/C (VIP/Executive Transport)',b:'USAF',c:'ttpt',p:'AFLCMC'},
c32a:{n:'C-32A (VIP Transport / Air Force Two)',b:'USAF',c:'ttpt',p:'AFLCMC'},
c37a:{n:'C-37A/B Gulfstream (Executive)',b:'USAF',c:'ttpt',p:'AFLCMC'},
c12j:{n:'C-12J Huron (Utility)',b:'USAF',c:'ttpt',p:'AFLCMC'},
vc25b:{n:'VC-25B (Next Air Force One)',b:'USAF',c:'ttpt',p:'AFLCMC'},
nkc_bridge:{n:'NKCT Next KC-X Bridge Tanker',b:'USAF',c:'ttpt',p:'AFLCMC'},
// ──── U.S. AIR FORCE — ISR & SPECIAL MISSION ────
e3g:{n:'E-3G Sentry (AWACS)',b:'USAF',c:'isr',p:'AFLCMC'},
e7a:{n:'E-7A Wedgetail (AWACS Replacement)',b:'USAF',c:'isr',p:'AFLCMC'},
e8c:{n:'E-8C JSTARS (Ground Surveillance)',b:'USAF',c:'isr',p:'AFLCMC'},
ec37b:{n:'EC-37B Compass Call (EW)',b:'USAF',c:'isr',p:'AFLCMC'},
rc135:{n:'RC-135V/W Rivet Joint (SIGINT)',b:'USAF',c:'isr',p:'AFLCMC'},
u2s:{n:'U-2S Dragon Lady (High-Alt ISR)',b:'USAF',c:'isr',p:'AFLCMC'},
rq4b:{n:'RQ-4B Global Hawk (HALE UAS)',b:'USAF',c:'isr',p:'AFLCMC'},
mq9a:{n:'MQ-9A Reaper (Hunter-Killer UAS)',b:'USAF',c:'isr',p:'AFLCMC'},
mc130j:{n:'MC-130J Commando II (Special Ops)',b:'USAF',c:'isr',p:'AFSOC'},
ac130j:{n:'AC-130J Ghostrider (Gunship)',b:'USAF',c:'isr',p:'AFSOC'},
cv22b:{n:'CV-22B Osprey (Special Ops)',b:'USAF',c:'isr',p:'AFSOC'},
hh60w:{n:'HH-60W Jolly Green II (CSAR)',b:'USAF',c:'isr',p:'AFLCMC'},
wc130j:{n:'WC-130J Weatherbird (Weather Recon)',b:'USAF',c:'isr',p:'AFLCMC'},
e4b:{n:'E-4B Nightwatch (NAOC)',b:'USAF',c:'isr',p:'AFLCMC'},
e11a:{n:'E-11A BACN (Battlefield Airborne Comm)',b:'USAF',c:'isr',p:'AFLCMC'},
rq170:{n:'RQ-170 Sentinel (Stealth UAS)',b:'USAF',c:'isr',p:'AFLCMC'},
rq180:{n:'RQ-180 (Advanced Stealth ISR UAS)',b:'USAF',c:'isr',p:'AFLCMC'},
mq20_avenger:{n:'MQ-20 Avenger (Loyal Wingman)',b:'USAF',c:'isr',p:'AFLCMC'},
xq58_valkyrie:{n:'XQ-58A Valkyrie (LCAAT UAS)',b:'USAF',c:'isr',p:'AFRL'},
// ──── U.S. AIR FORCE — TRAINERS ────
t7a:{n:'T-7A Red Hawk (Advanced Trainer)',b:'USAF',c:'trn',p:'AFLCMC'},
t38c:{n:'T-38C Talon (Advanced Trainer Legacy)',b:'USAF',c:'trn',p:'AFLCMC'},
t1a:{n:'T-1A Jayhawk (Tanker/Transport Trainer)',b:'USAF',c:'trn',p:'AFLCMC'},
t6a:{n:'T-6A Texan II (Primary Trainer)',b:'USAF',c:'trn',p:'AFLCMC'},
t51a:{n:'T-51A (Air Force Academy Trainer)',b:'USAF',c:'trn',p:'AFLCMC'},
// ──── U.S. AIR FORCE — NUCLEAR & STRATEGIC ────
lgm30g:{n:'LGM-30G Minuteman III ICBM',b:'USAF',c:'fnuc',p:'AFGSC / PEO Strategic'},
lgm35a:{n:'LGM-35A Sentinel GBSD (ICBM Replacement)',b:'USAF',c:'fnuc',p:'AFGSC'},
agm86b:{n:'AGM-86B ALCM (Air-Launched Cruise Missile)',b:'USAF',c:'fnuc',p:'AFGSC'},
agm181a:{n:'AGM-181A LRSO (Long Range Standoff Weapon)',b:'USAF',c:'fnuc',p:'AFGSC'},
mmiii_ws:{n:'Minuteman III Weapon System (MK-12A/21)',b:'USAF',c:'fnuc',p:'AFGSC'},
// ──── U.S. AIR FORCE — OTHER ASSETS ────
agilpod:{n:'AGILPOD Modular Open Mission System',b:'USAF',c:'foth',p:'AFRL'},
jdam:{n:'JDAM (Joint Direct Attack Munition)',b:'USAF',c:'foth',p:'AFLCMC'},
jsow:{n:'JSOW (Joint Standoff Weapon)',b:'USAF',c:'foth',p:'AFLCMC'},
sdb:{n:'SDB (Small Diameter Bomb GBU-39/53)',b:'USAF',c:'foth',p:'AFLCMC'},
agm158_jassm:{n:'AGM-158A JASSM',b:'USAF',c:'foth',p:'AFLCMC'},
agm158b:{n:'AGM-158B JASSM-ER',b:'USAF',c:'foth',p:'AFLCMC'},
aim9x:{n:'AIM-9X Sidewinder Block III',b:'USAF',c:'foth',p:'AFLCMC'},
aim120d:{n:'AIM-120D AMRAAM',b:'USAF',c:'foth',p:'AFLCMC'},
aim260:{n:'AIM-260 JATM (Joint Advanced Tactical Missile)',b:'USAF',c:'foth',p:'AFLCMC'},
gbu12:{n:'GBU-12 Paveway II (Laser Guided Bomb)',b:'USAF',c:'foth',p:'AFLCMC'},
gbu31:{n:'GBU-31 JDAM (2000-lb)',b:'USAF',c:'foth',p:'AFLCMC'},
gbu53:{n:'GBU-53/B StormBreaker (SDB II)',b:'USAF',c:'foth',p:'AFLCMC'},
agm114_usaf:{n:'AGM-114 Hellfire (MQ-9 Loadout)',b:'USAF',c:'foth',p:'AFLCMC'},
agm179_jagm:{n:'AGM-179 JAGM (Joint Air-to-Ground Missile)',b:'USAF',c:'foth',p:'PEO M&S'},
mald:{n:'MALD/MALD-J Miniature Air-Launched Decoy',b:'USAF',c:'foth',p:'AFLCMC'},

// ──── U.S. SPACE FORCE — SATELLITES & SPACE VEHICLES ────
gps3:{n:'GPS III / IIIF Navigation Satellite',b:'USSF',c:'sat',p:'SSC / GPS Directorate'},
gps3f:{n:'GPS IIIF (Follow-On with M-Code)',b:'USSF',c:'sat',p:'SSC'},
sbirs:{n:'SBIRS (Space-Based Infrared System)',b:'USSF',c:'sat',p:'SSC'},
ngo_opir:{n:'NGO Next-Gen OPIR (Missile Warning)',b:'USSF',c:'sat',p:'SSC'},
aehf:{n:'AEHF (Advanced Extremely High Frequency)',b:'USSF',c:'sat',p:'SSC'},
wgs:{n:'WGS (Wideband Global SATCOM)',b:'USSF',c:'sat',p:'SSC'},
muos:{n:'MUOS (Mobile User Objective System)',b:'USSF',c:'sat',p:'SSC'},
sda_transport:{n:'SDA Tranche Transport Layer (Proliferated LEO)',b:'USSF',c:'sat',p:'SDA'},
sda_tracking:{n:'SDA Tranche Tracking Layer (Missile Track)',b:'USSF',c:'sat',p:'SDA'},
gssap:{n:'GSSAP (Geosynchronous SSA Program)',b:'USSF',c:'sat',p:'SSC'},
milstar:{n:'MILSTAR (Legacy Protected SATCOM)',b:'USSF',c:'sat',p:'SSC'},
dmsp:{n:'DMSP (Defense Meteorological Satellite)',b:'USSF',c:'sat',p:'SSC'},
sbss:{n:'SBSS (Space-Based Surveillance System)',b:'USSF',c:'sat',p:'SSC'},
wsp:{n:'WSF/WSP (Weather System Follow-On)',b:'USSF',c:'sat',p:'SSC'},
ew_sat:{n:'EW/Cyber Space Payload (Classified)',b:'USSF',c:'sat',p:'SSC'},
tacsat:{n:'TacSat Tactical Satellite',b:'USSF',c:'sat',p:'SSC'},
// ──── U.S. SPACE FORCE — GROUND SYSTEMS ────
gps_ocx:{n:'GPS OCX (Next-Gen Ground Control)',b:'USSF',c:'sgnd',p:'SSC'},
ocs:{n:'OCS (Operational Control Segment)',b:'USSF',c:'sgnd',p:'SSC'},
space_fence:{n:'Space Fence (AN/FSY-3) Radar',b:'USSF',c:'sgnd',p:'SSC'},
cape:{n:'CAPE (Commercially Augmented Space ISR)',b:'USSF',c:'sgnd',p:'SSC'},
spadoc:{n:'SPADOC (Space Defense Operations Center)',b:'USSF',c:'sgnd',p:'SSC'},
vulcan:{n:'Vulcan Centaur Launch Vehicle',b:'USSF',c:'sgnd',p:'SSC'},
falcon9:{n:'Falcon 9 / Heavy (NSSL Phase 2)',b:'USSF',c:'sgnd',p:'SSC'},
atlas_v:{n:'Atlas V (Legacy Launch)',b:'USSF',c:'sgnd',p:'SSC'},
delta_iv:{n:'Delta IV Heavy (Retiring)',b:'USSF',c:'sgnd',p:'SSC'},
starshield:{n:'Starshield (DoD Comm Constellation)',b:'USSF',c:'sgnd',p:'SSC'},

// ──── U.S. COAST GUARD — CUTTERS & PATROL VESSELS ────
nsc:{n:'NSC WMSL Legend-class (National Security Cutter)',b:'USCG',c:'cut',p:'CG-9 / PD NSC'},
opc:{n:'OPC WMSM Heritage-class (Offshore Patrol Cutter)',b:'USCG',c:'cut',p:'CG-9 / PD OPC'},
frc:{n:'FRC WPC Sentinel-class (Fast Response Cutter)',b:'USCG',c:'cut',p:'CG-9 / PD FRC'},
wpb_island:{n:'WPB-110 Island-class Patrol Boat',b:'USCG',c:'cut',p:'CG-9'},
wpb_marine:{n:'WPB-87 Marine Protector-class',b:'USCG',c:'cut',p:'CG-9'},
wmec_270:{n:'WMEC-270 Famous-class (Medium Endurance)',b:'USCG',c:'cut',p:'CG-9'},
wmec_210:{n:'WMEC-210 Reliance-class (Medium Endurance)',b:'USCG',c:'cut',p:'CG-9'},
wagb_polar:{n:'WAGB Polar Star / Polar Sea (Icebreaker)',b:'USCG',c:'cut',p:'CG-9'},
wagb_healy:{n:'WAGB-20 Healy (Icebreaker)',b:'USCG',c:'cut',p:'CG-9'},
psc:{n:'PSC Polar Security Cutter (New Heavy Icebreaker)',b:'USCG',c:'cut',p:'CG-9'},
wlb_juniper:{n:'WLB-201 Juniper-class Seagoing Buoy Tender',b:'USCG',c:'cut',p:'CG-9'},
wlm_keeper:{n:'WLM-551 Keeper-class Coastal Buoy Tender',b:'USCG',c:'cut',p:'CG-9'},
wli:{n:'WLI Inland Buoy Tender',b:'USCG',c:'cut',p:'CG-9'},
wlic:{n:'WLIC Inland Construction Tender',b:'USCG',c:'cut',p:'CG-9'},
wlr:{n:'WLR Inland River Tender',b:'USCG',c:'cut',p:'CG-9'},
wtgb:{n:'WTGB-140 Bay-class Icebreaking Tug',b:'USCG',c:'cut',p:'CG-9'},
aton_boats:{n:'ATON Aids to Navigation Boats (Various)',b:'USCG',c:'cut',p:'CG-9'},
// ──── U.S. COAST GUARD — AVIATION & BOATS ────
mh65:{n:'MH-65 Dolphin (Short-Range Recovery)',b:'USCG',c:'caux',p:'CG-711'},
mh60t:{n:'MH-60T Jayhawk (Medium-Range Recovery)',b:'USCG',c:'caux',p:'CG-711'},
hc130j_cg:{n:'HC-130J Super Hercules (SAR/Patrol)',b:'USCG',c:'caux',p:'CG-711'},
hc27j:{n:'HC-27J Spartan (Medium Range Surveillance)',b:'USCG',c:'caux',p:'CG-711'},
c144:{n:'HC-144 Ocean Sentry (Maritime Patrol)',b:'USCG',c:'caux',p:'CG-711'},
c144b:{n:'HC-144B Minotaur',b:'USCG',c:'caux',p:'CG-711'},
c130h_cg:{n:'HC-130H Hercules (Legacy)',b:'USCG',c:'caux',p:'CG-711'},
rbm:{n:'Response Boat – Medium (45 ft)',b:'USCG',c:'caux',p:'CG-9'},
rbs:{n:'Response Boat – Small (29 ft)',b:'USCG',c:'caux',p:'CG-9'},
tanb:{n:'Transportable Port Security Boat',b:'USCG',c:'caux',p:'CG-9'},
msrt_boat:{n:'MSRT Special Ops Boats',b:'USCG',c:'caux',p:'CG-9'},
mlb:{n:'MLB 47-ft Motor Lifeboat',b:'USCG',c:'caux',p:'CG-9'},
special_purpose:{n:'SPB Special Purpose Craft',b:'USCG',c:'caux',p:'CG-9'},
sur_buoy:{n:'ScanEagle UAS (USCG)',b:'USCG',c:'caux',p:'CG-711'},

// ──── U.S. SOCOM — AVIATION ────
mh47g:{n:'MH-47G Chinook (160th SOAR)',b:'SOCOM',c:'soa',p:'SOCOM / PEO RW'},
mh60m:{n:'MH-60M Black Hawk DAP (160th SOAR)',b:'SOCOM',c:'soa',p:'SOCOM / PEO RW'},
mh60m_dap:{n:'MH-60M Direct Action Penetrator',b:'SOCOM',c:'soa',p:'SOCOM'},
mq9_socom:{n:'MQ-9A Reaper (SOCOM)',b:'SOCOM',c:'soa',p:'AFSOC'},
mc130j_sof:{n:'MC-130J Commando II (SOF)',b:'SOCOM',c:'soa',p:'AFSOC'},
ac130j_sof:{n:'AC-130J Ghostrider (SOF)',b:'SOCOM',c:'soa',p:'AFSOC'},
cv22b_sof:{n:'CV-22B Osprey (SOF)',b:'SOCOM',c:'soa',p:'AFSOC'},
a29_at6:{n:'A-29 / AT-6 Light Attack (SOF)',b:'SOCOM',c:'soa',p:'AFSOC'},
// ──── U.S. SOCOM — GROUND & MARITIME ────
gmv:{n:'GMV 1.1 Ground Mobility Vehicle',b:'SOCOM',c:'sog',p:'PEO SOF Warrior'},
nsm_swcc:{n:'SOC-R Special Operations Craft - Riverine',b:'SOCOM',c:'sog',p:'NSW / NSWC'},
ccm:{n:'CCM Combatant Craft Medium (Mark V Follow-On)',b:'SOCOM',c:'sog',p:'NSW'},
cch:{n:'CCH Combatant Craft Heavy',b:'SOCOM',c:'sog',p:'NSW'},
sealion:{n:'SEALION Swimmer Delivery System',b:'SOCOM',c:'sog',p:'NSW'},
mrzr_sof:{n:'MRZR-D LTATV (SOF)',b:'SOCOM',c:'sog',p:'PEO SOF Warrior'},
isv_sof:{n:'ISV Infantry Squad Vehicle (SOF)',b:'SOCOM',c:'sog',p:'PEO SOF Warrior'},

// ──── JOINT / MULTI-SERVICE ────
javelin:{n:'FGM-148 Javelin Anti-Tank Missile',b:'JOINT',c:'jmsl',p:'PEO M&S (Joint)'},
tow:{n:'BGM-71 TOW Anti-Tank Missile System',b:'JOINT',c:'jmsl',p:'PEO M&S'},
stinger:{n:'FIM-92 Stinger MANPADS',b:'JOINT',c:'jmsl',p:'PEO M&S'},
agm114_hellfire:{n:'AGM-114 Hellfire/R9X',b:'JOINT',c:'jmsl',p:'PEO M&S'},
agm179_jagm_j:{n:'AGM-179 JAGM (Joint Air-to-Ground)',b:'JOINT',c:'jmsl',p:'PEO M&S'},
agm88_harm:{n:'AGM-88 HARM / AARGM-ER',b:'JOINT',c:'jmsl',p:'NAVAIR'},
slam_er:{n:'AGM-84H SLAM-ER (Stand-Off Land Attack)',b:'JOINT',c:'jmsl',p:'PMA-201'},
maverick:{n:'AGM-65 Maverick',b:'JOINT',c:'jmsl',p:'AFLCMC'},
paveway:{n:'Paveway Series LGBs (GBU-10/12/16)',b:'JOINT',c:'jmsl',p:'AFLCMC'},
apkws:{n:'APKWS Laser-Guided Rocket',b:'JOINT',c:'jmsl',p:'NAVAIR'},
excalibur:{n:'M982 Excalibur Precision Guided Projectile',b:'JOINT',c:'jmsl',p:'PEO M&S'},
spike_nlos:{n:'Spike NLOS Missile',b:'JOINT',c:'jmsl',p:'PEO M&S'},
// ──── JOINT — SMALL ARMS & CREW-SERVED ────
m4a1:{n:'M4A1 Carbine 5.56mm',b:'JOINT',c:'jwpn',p:'PEO Soldier / PM SL'},
m249:{n:'M249 SAW (Squad Automatic Weapon)',b:'JOINT',c:'jwpn',p:'PEO Soldier'},
m240:{n:'M240B/L Machine Gun 7.62mm',b:'JOINT',c:'jwpn',p:'PEO Soldier'},
m2_bmg:{n:'M2A1 .50 Cal Heavy Machine Gun',b:'JOINT',c:'jwpn',p:'PEO Soldier'},
mk19:{n:'Mk 19 40mm Grenade Machine Gun',b:'JOINT',c:'jwpn',p:'PEO Soldier'},
m110a1:{n:'M110A1 CSASS 7.62mm Sniper',b:'JOINT',c:'jwpn',p:'PEO Soldier'},
m107:{n:'M107 .50 Cal Long Range Sniper Rifle',b:'JOINT',c:'jwpn',p:'PEO Soldier'},
m17:{n:'M17/M18 Modular Handgun (SIG P320)',b:'JOINT',c:'jwpn',p:'PEO Soldier'},
m320:{n:'M320 Grenade Launcher Module',b:'JOINT',c:'jwpn',p:'PEO Soldier'},
xm7:{n:'XM7 NGSW Rifle 6.8mm',b:'JOINT',c:'jwpn',p:'PEO Soldier'},
xm250:{n:'XM250 NGSW Automatic Rifle 6.8mm',b:'JOINT',c:'jwpn',p:'PEO Soldier'},
carl_gustaf:{n:'M3E1 Carl Gustaf 84mm Recoilless Rifle',b:'JOINT',c:'jwpn',p:'PEO Soldier'},
at4:{n:'M136 AT4 84mm Anti-Armor',b:'JOINT',c:'jwpn',p:'PEO Soldier'},
smaw:{n:'Mk 153 SMAW (Shoulder-Launched)',b:'JOINT',c:'jwpn',p:'MARCORSYSCOM'},
// ──── JOINT — C4ISR SYSTEMS ────
link16:{n:'Link 16 Tactical Data Link (MIDS-JTRS)',b:'JOINT',c:'jc4',p:'PEO C3T (Joint)'},
cec:{n:'CEC Cooperative Engagement Capability',b:'JOINT',c:'jc4',p:'PEO IWS'},
gccs_j:{n:'GCCS-J Global Command & Control System',b:'JOINT',c:'jc4',p:'DISA'},
jadocs:{n:'JADOCS Joint Automated Deep Operations',b:'JOINT',c:'jc4',p:'Joint'},
tbmcs:{n:'TBMCS Theater Battle Mgmt Core System',b:'JOINT',c:'jc4',p:'AFLCMC'},
dcgs:{n:'DCGS Distributed Common Ground System',b:'JOINT',c:'jc4',p:'Joint'},
jadc2:{n:'JADC2 Joint All-Domain Command & Control',b:'JOINT',c:'jc4',p:'Joint'},
abms:{n:'ABMS Advanced Battle Management System',b:'JOINT',c:'jc4',p:'USAF / Joint'},

// ──── Custom ────
custom:{n:'Custom Program (define your own)',b:'JOINT',c:'jc4',p:'Custom'}
};

// ═══════════════════════════════════════════
// SYSTEM TEMPLATES BY CATEGORY
// Used for auto-generating component data for platforms without explicit definitions
// ═══════════════════════════════════════════
const TEMPLATES = {
    svc: {
        sys:['Diesel Generator Set','HVAC System','Potable Water Maker','Sewage Treatment Plant','Anchor Windlass','Crane (5-Ton)','Fire Main System','Electrical Distribution Panel','Ventilation Fan','Galley Equipment'],
        fsc:['6115','4120','4610','4610','3950','3950','4210','6110','4140','7310'],
        mfg:['Caterpillar','Carrier','HEM Inc','Evoqua Water','Rolls-Royce','Liebherr','Hale Products','Eaton','Twin City Fan','Hobart'],
        mtbf:[6000,4500,3500,3000,5000,4000,5500,7000,6500,4000],mttr:[6,4,3,5,3,6,2,3,2,3],mldt:[48,36,48,72,36,72,24,24,24,36]
    },
    sc: {
        sys:['Phased Array Radar','Combat Management System','Gas Turbine Main Engine','Vertical Launch System','Electronic Warfare Suite','Anti-Submarine Warfare Suite','Close-In Weapon System','Ship Service Diesel Generator','5-inch Naval Gun','Navigation Radar'],
        fsc:['5841','5895','2835','1440','5865','5845','1440','6115','1005','5841'],
        mfg:['Raytheon','Lockheed Martin','GE Aviation','Lockheed Martin','Northrop Grumman','Raytheon','Raytheon','Fairbanks Morse','BAE Systems','Furuno'],
        mtbf:[1800,1100,3200,4500,1500,1200,3500,5000,2800,4000],mttr:[6,4,8,3,5,5,2.5,6,4,2],mldt:[48,24,72,24,48,36,24,36,48,12]
    },
    cv: {
        sys:['Aircraft Launch System','Aircraft Recovery System','Nuclear Reactor Plant','Enterprise Air Surveillance Radar','Advanced Weapons Elevator','Ship Self-Defense System','Aircraft Handling Equipment','4160V Electrical Distribution','HVAC Zonal System','Steering Gear'],
        fsc:['1680','1680','9310','5841','3540','1440','1680','6110','4120','2010'],
        mfg:['GA-EMS','GA-EMS','Bechtel Marine','Raytheon','AMSEC','Raytheon','NAVAIR','GE','Carrier','Jastram'],
        mtbf:[400,600,8000,1500,500,900,2000,5000,4000,6000],mttr:[12,8,24,6,10,4,4,3,4,4],mldt:[72,48,168,48,96,24,36,24,24,36]
    },
    sub: {
        sys:['Reactor Plant / Propulsion','Sonar Suite','Combat Control System','Torpedo Launching System','Photonics Mast','Ship Control System','Atmospheric Control Equipment','Inertial Navigation System','Submarine Communications','Auxiliary Seawater System'],
        fsc:['9310','5845','5895','1440','5860','2010','4120','6605','5820','4320'],
        mfg:['GE/Bechtel','Lockheed Martin','Lockheed Martin','General Dynamics','L3Harris','Lockheed Martin','Hamilton Sundstrand','Northrop Grumman','Raytheon','Flowserve'],
        mtbf:[8000,1200,1500,4000,2000,3000,3500,5000,2500,4500],mttr:[24,6,4,3,4,5,4,2,3,4],mldt:[168,72,48,48,72,36,36,24,36,48]
    },
    amph: {
        sys:['Main Propulsion Diesel','Well Deck Ballast System','Aviation Support Equipment','Combat System / Radar','Self-Defense Weapons','Vehicle Ramp/Gate System','Damage Control System','Diesel Generator','Communications Suite','Medical Facilities/HVAC'],
        fsc:['2815','4320','1680','5841','1440','3540','4210','6115','5820','4120'],
        mfg:['Fairbanks Morse','Flowserve','NAVAIR','Raytheon','Raytheon','AMSEC','Hale Products','Caterpillar','Harris Corp','Carrier'],
        mtbf:[3000,2500,1800,1400,3000,2000,4000,4500,2000,3500],mttr:[8,6,5,5,3,6,3,5,3,4],mldt:[72,48,48,48,36,72,24,36,36,36]
    },
    mine: {
        sys:['Mine Hunting Sonar','Mine Neutralization System','Diesel Propulsion','Navigation & Positioning','Combat Data System','Mine Countermeasures ROV','Degaussing System','Damage Control','Generator Set','Survey Motor Launch'],
        fsc:['5845','1440','2815','6605','5895','2040','5865','4210','6115','1940'],
        mfg:['Raytheon','BAE Systems','Isotta Fraschini','Sperry Marine','Lockheed Martin','ECA Robotics','Polyamp AB','Hale Products','Caterpillar','SAFE Boats'],
        mtbf:[1000,1200,2500,3500,1800,800,2000,4000,4500,3000],mttr:[4,5,6,2,3,3,3,2,4,3],mldt:[48,72,48,24,36,72,36,24,36,24]
    },
    pat: {
        sys:['Diesel Engines','Weapons Mount (25mm/50cal)','Navigation Radar','Communications Suite','Electro-Optic Sensor','Damage Control','Generator','Waterjet Propulsion','Hull Structure','Boarding/VBSS Equipment'],
        fsc:['2815','1005','5841','5820','5860','4210','6115','2040','1940','1005'],
        mfg:['MTU','BAE Systems','Furuno','Harris Corp','FLIR Systems','Hale Products','Caterpillar','Hamilton Jet','SAFE Boats','Various'],
        mtbf:[3000,3500,4000,2500,2000,5000,4000,3500,8000,5000],mttr:[6,3,2,2,3,2,4,4,8,2],mldt:[48,36,24,24,36,24,36,48,96,24]
    },
    aux: {
        sys:['Main Diesel Propulsion','Cargo Handling/UNREP System','Navigation Bridge System','Diesel Generator Sets','Fuel/Cargo Transfer Pumps','Communications Suite','Damage Control System','HVAC/Refrigeration','Anchor/Mooring System','Crane/Kingpost System'],
        fsc:['2815','3950','6610','6115','4320','5820','4210','4120','3950','3950'],
        mfg:['Fairbanks Morse','FMC Technologies','Sperry Marine','Caterpillar','Flowserve','Harris Corp','Hale Products','Carrier','Towimor','Liebherr'],
        mtbf:[3500,2800,5000,4500,3500,2500,5000,4000,6000,3500],mttr:[8,5,2,5,4,3,2,4,3,5],mldt:[72,48,24,36,48,36,24,36,36,72]
    },
    nair: {
        sys:['Turbofan/Turboprop Engine','AESA/APG Radar','Electronic Warfare Suite','Targeting/Sensor System','Mission Computer','Cockpit Displays/HUD','Ejection Seat','Flight Control System','Landing Gear','Communication/Data Link'],
        fsc:['2840','5841','5865','5860','7050','6610','1680','1680','1620','5820'],
        mfg:['GE Aviation','Raytheon','BAE Systems','Lockheed Martin','Lockheed Martin','Collins Aerospace','Martin-Baker','Moog','Heroux-Devtek','L3Harris'],
        mtbf:[300,600,700,800,1500,2000,10000,1200,3000,2500],mttr:[8,4,3,3,2,2,1,3,4,2],mldt:[120,72,48,48,24,24,24,36,48,24]
    },
    nhelo: {
        sys:['Turboshaft Engine(s)','Main Rotor System','Tail Rotor/Anti-Torque','Flight Control System','FLIR/EO Sensor','Avionics/Glass Cockpit','Weapons/Hardpoints','Landing Gear','Rescue Hoist/Cargo Hook','Communication Suite'],
        fsc:['2840','1615','1615','1680','5860','6610','1005','1620','1680','5820'],
        mfg:['GE Aviation','Sikorsky','Sikorsky','Collins Aerospace','Raytheon','L3Harris','Lockheed Martin','Heroux-Devtek','Breeze-Eastern','Harris Corp'],
        mtbf:[400,800,1200,1500,900,2000,3000,3000,2500,2500],mttr:[8,10,6,3,3,2,2,3,3,2],mldt:[96,72,48,36,48,24,36,36,36,24]
    },
    nuav: {
        sys:['Propulsion System','ISR Sensor Payload','Satellite Data Link','Mission Computer','Navigation System','De-Icing/Environmental','Ground Control Station','Launch/Recovery Equipment','EO/IR Camera Turret','SIGINT/COMINT Payload'],
        fsc:['2840','5860','5820','7050','6605','4120','7050','1680','5860','5895'],
        mfg:['Rolls-Royce','Northrop Grumman','L3Harris','General Atomics','Honeywell','Various','General Atomics','General Atomics','L3Harris','Raytheon'],
        mtbf:[500,600,800,1500,2000,3000,1200,2000,700,600],mttr:[6,4,3,2,2,3,3,4,3,4],mldt:[72,48,36,24,24,36,48,48,36,48]
    },
    nsb: {
        sys:['Diesel Engine(s)','Propulsion System','Navigation/GPS','Communications','Weapons Mount','Hull Structure','Generator','Fuel System','Damage Control','Electronic Systems'],
        fsc:['2815','2040','6605','5820','1005','1940','6115','2915','4210','5895'],
        mfg:['MTU','Hamilton Jet','Garmin','Harris Corp','FN Herstal','SAFE Boats','Cummins','Robertson Fuel','Various','L3Harris'],
        mtbf:[3000,3500,5000,2500,4000,8000,4000,5000,6000,2500],mttr:[6,4,2,2,2,6,3,2,2,3],mldt:[48,36,12,24,24,72,24,24,24,36]
    },
    nwpn: {
        sys:['Propulsion Section','Guidance Section','Warhead Section','Seeker Head','Data Link','Control Section','Booster Motor','Launch System Interface','Safe/Arm Device','Shipping Container/Magazine'],
        fsc:['1440','5841','1340','5860','5820','1440','1440','1440','1440','8140'],
        mfg:['Raytheon','Raytheon','General Dynamics','BAE Systems','L3Harris','Lockheed Martin','Aerojet Rocketdyne','BAE Systems','Kaman','Various'],
        mtbf:[5000,3000,10000,2000,3000,5000,8000,4000,10000,15000],mttr:[2,2,1,2,2,2,1,3,1,1],mldt:[96,72,168,96,48,72,96,48,72,24]
    },
    mgnd: {
        sys:['Diesel/Turbine Engine','Weapons System/Turret','Driver Display System','C4I/BFT System','Protection System','Suspension/Drivetrain','NBC Protection','Communication Suite','Power Distribution','Hull/Armor Structure'],
        fsc:['2815','1005','5855','5895','1240','2530','4240','5820','6110','1240'],
        mfg:['Caterpillar','Kongsberg','BAE Systems','General Dynamics','Rafael/DRS','GDLS','GDLS','Harris Corp','GDLS','Composite Armor'],
        mtbf:[2500,3000,2000,1800,2500,3000,4000,2000,3500,8000],mttr:[10,4,3,2,3,6,3,2,3,8],mldt:[72,48,36,24,72,48,36,24,24,96]
    },
    mav: {
        sys:['Turboshaft/Turbofan Engine','Rotor/Lift System','Flight Controls','Weapons System','Sensor/Targeting Pod','Avionics Suite','EW/Countermeasures','Landing Gear','Fuel System','Communications'],
        fsc:['2840','1615','1680','1005','5860','6610','5865','1620','2915','5820'],
        mfg:['GE Aviation','Bell/Sikorsky','Moog','Lockheed Martin','Raytheon','Collins Aerospace','BAE Systems','Messier-Dowty','Robertson Fuel','Harris Corp'],
        mtbf:[400,800,1200,2500,600,1800,1000,3000,4000,2500],mttr:[8,10,4,3,3,2,3,3,2,2],mldt:[120,72,36,36,48,24,48,36,24,24]
    },
    mc4: {
        sys:['Antenna Array','Processor/Computer Unit','Display System','Power Supply','Cooling System','Transport Vehicle','Cabling/Interconnects','Software System','Test Equipment','Generator'],
        fsc:['5985','7050','6610','6130','4120','2320','6145','7050','6625','6115'],
        mfg:['Northrop Grumman','L3Harris','BAE Systems','Various','Various','Oshkosh','Various','Lockheed Martin','Keysight','Caterpillar'],
        mtbf:[2000,1500,2500,4000,3000,5000,6000,800,3000,4500],mttr:[4,3,2,2,3,3,1,4,2,4],mldt:[48,36,24,24,36,48,12,48,24,36]
    },
    tank: {
        sys:['Gas Turbine Engine','Main Gun System (120mm)','Thermal Viewer/Sights','Remote Weapon Station','Active Protection System','Blue Force Tracker','NBC Collective Protection','Track & Suspension','Auxiliary Power Unit','Hull/Turret Armor'],
        fsc:['2835','1005','5855','1005','1440','5895','4240','2530','2835','1240'],
        mfg:['Honeywell','Rheinmetall/GDLS','DRS Technologies','Kongsberg','Rafael/DRS','General Dynamics C4','GDLS','GDLS','Honeywell','Composite Armor'],
        mtbf:[500,3000,2000,2500,2000,1800,4000,1500,2500,10000],mttr:[12,4,3,2,3,2,3,8,4,16],mldt:[96,48,36,24,72,24,36,48,48,120]
    },
    ifv: {
        sys:['Diesel Engine','Turret/Weapons Station','Driver Vision System','Blue Force Tracker','Remote Weapon Station','Suspension System','NBC Protection','Vehicle Intercom','Driveline/Transfer Case','Armor Kit'],
        fsc:['2815','1005','5855','5895','1005','2530','4240','5831','2520','1240'],
        mfg:['Caterpillar','Northrop Grumman','BAE Systems','General Dynamics','Kongsberg','GDLS','GDLS','Bose Military','GDLS','GDLS'],
        mtbf:[2000,2500,2000,1800,2500,2500,4000,3000,3000,8000],mttr:[8,4,3,2,2,6,3,2,4,10],mldt:[72,48,36,24,24,48,36,24,36,96]
    },
    arty: {
        sys:['Launcher/Howitzer Tube','Fire Control Computer','Chassis/Prime Mover','Ammunition Handling','Navigation/Positioning','Communication Suite','Hydraulic System','Power Unit','Cab/Protection Kit','Recoil System'],
        fsc:['1005','1430','2320','1440','6605','5820','3040','6115','1240','1005'],
        mfg:['BAE Systems','Lockheed Martin','Oshkosh','Lockheed Martin','Northrop Grumman','Harris Corp','Moog','DRS Technologies','BAE Systems','Various'],
        mtbf:[1500,2000,3000,2500,3500,2500,2500,3000,5000,3000],mttr:[6,3,8,4,2,2,4,3,2,4],mldt:[72,48,48,36,24,24,36,36,24,48]
    },
    tac: {
        sys:['Diesel Engine','Transmission/Drivetrain','Suspension/Axles','Armor/Protection Kit','Communications','Navigation/BFT','HVAC/NBC System','Electrical System','Cargo/Crane System','Tires/Run-Flat System'],
        fsc:['2815','2520','2530','1240','5820','5895','4120','6110','3950','2610'],
        mfg:['Caterpillar','Allison','Oshkosh','BAE Systems','Harris Corp','General Dynamics','Red Dot','Eaton','Oshkosh','Michelin'],
        mtbf:[3000,4000,3500,8000,2500,2000,4000,5000,3500,4000],mttr:[6,4,4,6,2,2,3,2,3,3],mldt:[48,36,48,72,24,24,24,24,36,24]
    },
    aav: {
        sys:['Turboshaft Engine(s)','Rotor/Transmission','Flight Controls','Sensor/FLIR/Radar','Avionics/MFDs','Weapons/Pylons','Landing Gear','Fuel System','Communication Suite','Defensive Equipment'],
        fsc:['2840','1615','1680','5860','6610','1005','1620','2915','5820','5865'],
        mfg:['GE Aviation','Boeing/Bell','Honeywell','Lockheed Martin','Collins Aerospace','Boeing','Boeing','Robertson Fuel','L3Harris','BAE Systems'],
        mtbf:[400,800,1200,600,1500,3000,3000,4000,2500,2000],mttr:[8,12,4,4,2,2,3,2,2,3],mldt:[120,96,36,72,24,36,36,24,24,48]
    },
    ada: {
        sys:['Phased Array Radar','Fire Control Computer','Missile Launcher','Missile Round','Command Post','Power Generator Set','Antenna Mast Group','Communication System','Engagement Control Station','Cooling System'],
        fsc:['5841','7050','1440','1440','5895','6115','5985','5820','5895','4120'],
        mfg:['Raytheon','Lockheed Martin','Lockheed Martin','Raytheon','Northrop Grumman','DRS Technologies','Raytheon','Harris Corp','Lockheed Martin','Various'],
        mtbf:[1200,1500,3000,5000,1800,3000,2000,2500,1500,3500],mttr:[6,3,4,1,3,4,3,2,3,3],mldt:[72,48,48,96,36,36,48,24,36,24]
    },
    ac4: {
        sys:['Antenna/Sensor Array','Signal Processor','Display & Control Unit','Power Conditioning','Vehicle Platform','Software Load','Test & Maintenance Kit','Interconnect Cables','Generator Set','Cooling/Environmental'],
        fsc:['5985','5895','6610','6130','2320','7050','6625','6145','6115','4120'],
        mfg:['Northrop Grumman','L3Harris','BAE Systems','Elbit Systems','AM General','Lockheed Martin','Keysight','Various','Cummins','DRS Technologies'],
        mtbf:[1500,1200,2500,4000,5000,800,3000,6000,4500,3500],mttr:[4,3,2,2,6,4,2,1,4,3],mldt:[48,36,24,24,48,48,24,12,36,24]
    },
    aeng: {
        sys:['Diesel Engine','Hydraulic System','Blade/Bucket Assembly','Track/Suspension','Electrical System','Operator Controls','Structural Frame','Winch/Cable System','Environmental Protection','Fire Suppression'],
        fsc:['2815','3040','3815','2530','6110','6610','3990','3950','4120','4210'],
        mfg:['Caterpillar','Parker Hannifin','Caterpillar','Caterpillar','Eaton','Caterpillar','Caterpillar','Braden Winch','Various','Kidde'],
        mtbf:[3000,2000,2500,2000,4000,5000,6000,3500,4000,8000],mttr:[8,4,4,6,2,2,4,3,2,1],mldt:[48,36,48,48,24,24,36,36,24,12]
    },
    ftr: {
        sys:['Turbofan Engine','AESA Radar','Electronic Warfare Suite','Electro-Optical Targeting System','Mission Computer','Helmet-Mounted Display','Internal Gun','Flight Control Computer','Ejection Seat','Data Link System'],
        fsc:['2840','5841','5865','5860','7050','1240','1005','1680','1680','5895'],
        mfg:['Pratt & Whitney','Raytheon','BAE Systems','Lockheed Martin','Lockheed Martin','Collins Aerospace','General Dynamics OTS','Moog','Martin-Baker','L3Harris'],
        mtbf:[300,600,700,1000,1500,2000,5000,1200,10000,2500],mttr:[6,4,3,2,2,2,2,3,1,2],mldt:[120,72,48,36,24,24,24,36,24,24]
    },
    bmr: {
        sys:['Engine(s)','Low-Observable Coating System','Radar/Sensor Fusion','Mission Computer','Electronic Warfare Suite','Weapons Bay System','Navigation/GPS Anti-Jam','Environmental Control','Defensive Management System','Landing Gear'],
        fsc:['2840','5340','5841','7050','5865','3040','5826','4120','5865','1620'],
        mfg:['Pratt & Whitney','Northrop Grumman','Northrop Grumman','Northrop Grumman','BAE Systems','Moog','L3Harris','Hamilton Sundstrand','Northrop Grumman','Boeing'],
        mtbf:[3000,500,800,1500,700,2000,3000,3500,800,4000],mttr:[12,8,4,2,3,4,2,3,3,4],mldt:[168,120,72,24,48,48,24,36,48,48]
    },
    ttpt: {
        sys:['Turbofan Engine(s)','Avionics Suite','Aerial Refueling System','Cargo Handling System','Autopilot/FMS','Communications Suite','APU','Landing Gear','Environmental Control','Defensive Systems'],
        fsc:['2840','6610','4920','1730','6610','5820','2835','1620','4120','5865'],
        mfg:['Pratt & Whitney','Collins Aerospace','Cobham','Boeing','Honeywell','L3Harris','Honeywell','Boeing','Hamilton Sundstrand','BAE Systems'],
        mtbf:[3000,2000,1200,4000,2500,2500,3500,4000,3500,2000],mttr:[12,3,6,3,2,2,4,4,3,3],mldt:[168,24,96,36,24,24,48,48,36,48]
    },
    isr: {
        sys:['Engine(s)/Powerplant','ISR Sensor Suite','SIGINT/ELINT Payload','Mission Computer System','Communications/Data Link','Navigation System','Autopilot/Flight Controls','Environmental Control','Defensive Systems','Ground Processing System'],
        fsc:['2840','5860','5895','7050','5820','6605','6610','4120','5865','7050'],
        mfg:['Various','Raytheon','L3Harris','BAE Systems','L3Harris','Honeywell','Collins Aerospace','Hamilton Sundstrand','BAE Systems','Lockheed Martin'],
        mtbf:[3000,600,700,1500,2000,3000,2500,3500,2000,1500],mttr:[12,4,4,2,3,2,2,3,3,3],mldt:[168,72,72,24,36,24,24,36,48,36]
    },
    trn: {
        sys:['Turbofan/Turboprop Engine','Avionics Suite','Ejection Seats (Dual)','Flight Controls','Landing Gear','Oxygen System','Communications','Navigation','Environmental Control','Training System Interface'],
        fsc:['2840','6610','1680','1680','1620','1680','5820','6605','4120','7050'],
        mfg:['GE Aviation','Collins Aerospace','Martin-Baker','Moog','Heroux-Devtek','Cobham','Harris Corp','Honeywell','Hamilton Sundstrand','CAE'],
        mtbf:[500,2000,10000,1200,3000,5000,3000,3500,3500,2000],mttr:[6,2,1,3,3,2,2,2,3,2],mldt:[96,24,24,36,48,24,24,24,36,24]
    },
    fnuc: {
        sys:['Solid Rocket Motor','Guidance System','Re-Entry Vehicle','Warhead/Physics Package','Post-Boost Vehicle','Launch Facility','Ground Electronics','Power Supply','Security Perimeter','Communications'],
        fsc:['1440','5841','1440','1340','1440','1440','5895','6130','5840','5820'],
        mfg:['Northrop Grumman','Boeing','Lockheed Martin','(Classified)','(Classified)','Boeing','Northrop Grumman','(Classified)','Various','Harris Corp'],
        mtbf:[10000,5000,10000,50000,10000,20000,3000,8000,5000,3000],mttr:[48,24,48,168,48,24,4,4,2,3],mldt:[720,360,720,720,720,168,48,48,24,36]
    },
    foth: {
        sys:['Propulsion Section','Guidance & Navigation','Warhead','Seeker','Control Fins','Data Link','Rocket Motor','Fuze System','Launcher Interface','Container/Shipping'],
        fsc:['1440','5841','1340','5860','1560','5820','1440','1340','1440','8140'],
        mfg:['Raytheon','Raytheon','General Dynamics','BAE Systems','Lockheed Martin','L3Harris','Aerojet Rocketdyne','Kaman','Various','Various'],
        mtbf:[8000,5000,15000,3000,8000,5000,10000,15000,5000,20000],mttr:[2,2,1,2,1,2,1,1,2,1],mldt:[96,72,168,72,96,48,96,72,48,24]
    },
    sat: {
        sys:['Mission Payload','Atomic Clock / Frequency Ref','Solar Array Assembly','Attitude Control System','Reaction Wheel Assembly','Star Tracker','Transponder (S/L/Ka-Band)','Antenna Assembly','Thermal Control Subsystem','Spacecraft Bus (Structure)'],
        fsc:['5841','6645','6130','1680','1680','6650','5841','5985','4120','1680'],
        mfg:['Lockheed Martin','Microsemi/Excelitas','Spectrolab','Northrop Grumman','Honeywell','Ball Aerospace','General Dynamics','Lockheed Martin','Various','Lockheed Martin'],
        mtbf:[5000,8000,4000,6000,4000,7000,5000,6000,5000,8000],mttr:[0,0,0,0,0,0,0,0,0,0],mldt:[8760,8760,8760,8760,8760,8760,8760,8760,8760,8760]
    },
    sgnd: {
        sys:['Phased Array Radar','Signal Processor','Operations Center','Power Generator','Cooling System','Antenna Pedestal','Communications Interface','Software System','UPS/Power Conditioning','Security System'],
        fsc:['5841','5895','7050','6115','4120','5985','5820','7050','6130','5840'],
        mfg:['Lockheed Martin','Raytheon','Raytheon','Caterpillar','Carrier','L3Harris','Harris Corp','Raytheon','Eaton','Various'],
        mtbf:[2000,1500,1800,4000,3500,3000,2500,1000,5000,4000],mttr:[6,3,3,4,3,4,2,4,2,2],mldt:[72,48,36,36,24,48,24,48,24,12]
    },
    cut: {
        sys:['Main Diesel/Gas Turbine','Naval Gun System','Close-In Defense','Navigation Radar','Communications Suite','RHIB/Boat Handling','Diesel Generator','Damage Control System','Bridge Electronics','Anchor/Mooring'],
        fsc:['2835','1005','1005','5841','5820','1940','6115','4210','6610','3950'],
        mfg:['GE Aviation','BAE Systems','Raytheon','Furuno','Harris Corp','SAFE Boats','Caterpillar','Hale Products','Sperry Marine','Towimor'],
        mtbf:[2800,2200,3500,4000,2500,5000,4500,5000,3500,6000],mttr:[8,3,2.5,2,2,2,4,2,2,3],mldt:[72,36,24,24,24,12,36,24,24,36]
    },
    caux: {
        sys:['Engine(s)','Rotor/Propulsion System','Avionics/Navigation','SAR Sensor Suite','Rescue Hoist/Equipment','Communications','Flight Controls','Environmental Control','Fuel System','De-Icing System'],
        fsc:['2840','1615','6610','5860','1680','5820','1680','4120','2915','1560'],
        mfg:['GE Aviation','Airbus/Sikorsky','Collins Aerospace','FLIR Systems','Breeze-Eastern','Harris Corp','Moog','Hamilton Sundstrand','Robertson Fuel','Various'],
        mtbf:[400,800,2000,1000,2500,2500,1500,3000,4000,3000],mttr:[8,10,2,3,3,2,3,3,2,3],mldt:[96,72,24,48,36,24,36,36,24,36]
    },
    soa: {
        sys:['Enhanced Turboshaft/Turbofan','Modified Avionics Suite','Terrain Following Radar','FLIR/Multi-Spectral Sensor','Special Mission Equipment','Defensive Systems','Aerial Refueling Probe','Enhanced Comm (SATCOM)','Modified Fuel System','Assault/Fast-Rope Equipment'],
        fsc:['2840','6610','5841','5860','1680','5865','4920','5820','2915','1680'],
        mfg:['GE Aviation','Collins Aerospace','Raytheon','L3Harris','Boeing','BAE Systems','Cobham','L3Harris','Robertson Fuel','Various'],
        mtbf:[350,1500,800,600,1200,1500,3000,2000,4000,5000],mttr:[8,2,4,3,4,3,3,2,2,2],mldt:[120,24,72,48,72,48,48,36,24,24]
    },
    sog: {
        sys:['Engine/Powerplant','Weapons System','Navigation/GPS','Communications (SATCOM)','Armor/Protection','EO/IR Sensor','Power Supply','Medical Equipment','Hull/Structure','Boarding/SOF Equipment'],
        fsc:['2815','1005','6605','5820','1240','5860','6130','6515','1940','1005'],
        mfg:['MTU','FN Herstal','Garmin','L3Harris','Various','FLIR Systems','Various','North American Rescue','SAFE Boats','Various'],
        mtbf:[3000,4000,5000,2000,8000,2000,4000,6000,8000,5000],mttr:[6,2,1,2,4,3,2,1,6,2],mldt:[48,24,12,24,72,36,24,12,72,24]
    },
    jmsl: {
        sys:['Propulsion Motor','Guidance System','Seeker Head','Warhead','Control Section','Data Link','Booster','Safe & Arm Device','Launch Interface','Shipping Container'],
        fsc:['1440','5841','5860','1340','1440','5820','1440','1340','1440','8140'],
        mfg:['Aerojet Rocketdyne','Raytheon','BAE Systems','General Dynamics','Lockheed Martin','L3Harris','ATK Orbital','Kaman','Various','Various'],
        mtbf:[8000,5000,3000,15000,8000,5000,10000,15000,5000,20000],mttr:[1,2,2,1,1,2,1,1,2,1],mldt:[96,72,96,168,72,48,96,72,48,24]
    },
    jwpn: {
        sys:['Barrel Assembly','Bolt/Carrier Group','Fire Control Assembly','Stock/Receiver','Optic/Sight','Suppressor/Muzzle Device','Magazine','Ammunition Feed','Tripod/Mount','Cleaning/Maintenance Kit'],
        fsc:['1005','1005','1005','1005','1240','1005','1005','1005','1005','4933'],
        mfg:['FN Herstal','Colt','Various','SIG Sauer','Trijicon','SureFire','Magpul','FN Herstal','Capco','Otis Technology'],
        mtbf:[10000,8000,6000,15000,5000,10000,8000,6000,15000,20000],mttr:[0.5,0.5,1,0.5,0.25,0.25,0.1,0.5,0.5,0.25],mldt:[12,12,12,12,12,12,4,12,12,4]
    },
    jc4: {
        sys:['Terminal/Workstation','Server/Processor','Network Router/Switch','Encryption Device','Antenna System','UPS/Power System','Software Application','Display System','Cabling Infrastructure','Cooling/Shelter'],
        fsc:['7050','7050','5895','5810','5985','6130','7050','6610','6145','4120'],
        mfg:['Dell Technologies','HPE','Cisco','General Dynamics','L3Harris','APC/Schneider','Various','Samsung','Belden','DRS Technologies'],
        mtbf:[5000,4000,6000,8000,3000,5000,1500,4000,10000,4000],mttr:[1,2,1,2,3,2,2,1,1,3],mldt:[12,24,12,24,36,24,24,12,12,24]
    }
};

// ═══════════════════════════════════════════
// EXPLICIT COMPONENT OVERRIDES
// For key platforms that have specific known systems
// ═══════════════════════════════════════════
const COMPONENTS = {
    ddg51_fltIII:{sys:['AN/SPY-6(V)1 AMDR Radar','Mk 41 Vertical Launch System','LM2500 Gas Turbine Engine','AN/SQQ-89A(V)15 ASW Suite','Aegis Baseline 10 Combat System','CIWS Phalanx Block 1B','AN/SLQ-32(V)6 SEWIP EW','5-inch Mk 45 Mod 4 Gun','Ship Service Diesel Generator','Hybrid Electric Drive'],mfg:['Raytheon','Lockheed Martin','GE Aviation','Raytheon','Lockheed Martin','Raytheon','Northrop Grumman','BAE Systems','Fairbanks Morse','GE Aviation']},
    ddg51:{sys:['AN/SPY-1D(V) Radar','Mk 41 VLS','LM2500 Gas Turbine','Aegis Combat System','AN/SQQ-89 ASW','CIWS Phalanx','AN/SLQ-32 EW','Mk 45 5-inch Gun','SSDGs','Steering Gear'],mfg:['Lockheed Martin','Lockheed Martin','GE Aviation','Lockheed Martin','Raytheon','Raytheon','Raytheon','BAE Systems','Fairbanks Morse','Jastram']},
    ddg1000:{sys:['AN/SPY-3 Multi-Function Radar','Total Ship Computing Environment','MT30 Gas Turbine (Rolls-Royce)','Advanced Gun System (155mm)','Mk 57 PVLS','Integrated Undersea Warfare','Integrated Power System','Permanent Magnet Motor','Low Observable Hull','Ship Control System'],mfg:['Raytheon','Raytheon','Rolls-Royce','BAE Systems','Raytheon','Lockheed Martin','Raytheon','DRS Technologies','HII/BIW','Raytheon']},
    cg47:{sys:['AN/SPY-1A/B Radar','Aegis Weapon System','LM2500 Gas Turbine','Mk 41/26 VLS','AN/SQQ-89 ASW','CIWS Phalanx','Mk 45 5-inch Gun','SLQ-32 EW','SSDGs','SPQ-9B Horizon Search'],mfg:['Lockheed Martin','Lockheed Martin','GE Aviation','Lockheed Martin','Raytheon','Raytheon','BAE Systems','Raytheon','Caterpillar','Northrop Grumman']},
    ffg62:{sys:['AN/SPY-6(V)3 Radar','Mk 41 VLS (32-cell)','CODLOG Propulsion System','NSM Anti-Ship Missile','Mk 110 57mm Gun','AN/SQQ-89(V) ASW Suite','COMBATSS-21 CMS','Ship Service Diesel Generator','SeaRAM Block 2','RHIB/Boat Handling'],mfg:['Raytheon','Lockheed Martin','CODLOG (MAN/GE)','Kongsberg/Raytheon','BAE Systems','Raytheon','Raytheon','Fairbanks Morse','Raytheon','SAFE Boats']},
    cvn78:{sys:['EMALS (Electromagnetic Aircraft Launch)','AAG Advanced Arresting Gear','A1B Nuclear Reactor Plant','AN/SPY-6(V)3 Radar','Dual Band Radar','Advanced Weapons Elevator','Ship Self-Defense System','Aircraft Launch & Recovery','4160V Electrical Distribution','HVAC Zonal System'],mfg:['GA-EMS','GA-EMS','Bechtel Marine','Raytheon','Raytheon','AMSEC','Raytheon','NAVAIR','GE','Carrier']},
    ssn774:{sys:['S9G PWR Reactor','AN/BQQ-10 Sonar','AN/BYG-1 Combat System','Mk 48 ADCAP Torpedo Tube','AN/BVS-1 Photonics Mast','Ship Control System','Atmosphere Control Equipment','WSN-7 Navigation','AN/BRA-34 Comms Mast','Main Seawater System'],mfg:['GE/Bechtel','Lockheed Martin','Lockheed Martin','General Dynamics','L3Harris','Lockheed Martin','Hamilton Sundstrand','Northrop Grumman','Raytheon','Flowserve']},
    ssbn826:{sys:['Columbia-class Reactor Plant','Common Missile Compartment (CMC)','Trident D5LE SLBM Interface','AN/BYG-1 Combat System','Large Aperture Bow Array','X-Stern Configuration','Electric Drive Propulsion','Integrated Power System','Life-of-Ship Reactor Core','Advanced Quieting Systems'],mfg:['Bechtel Marine','General Dynamics EB','Lockheed Martin','Lockheed Martin','Raytheon','HII/GDEB','DRS Technologies','GE Aviation','Bechtel/GE','Various']},
    f35c:{sys:['F135-PW-400 Engine','AN/APG-81 AESA Radar','DAS Distributed Aperture System','EOTS Electro-Optical Targeting','AN/ASQ-239 EW Suite','Mission Systems Block 4','HMDS Gen III Helmet','25mm GAU-22/A Gun','ODIN Logistics System','Mk US16E Ejection Seat'],mfg:['Pratt & Whitney','Northrop Grumman','Northrop Grumman','Lockheed Martin','BAE Systems','Lockheed Martin','Collins Aerospace','General Dynamics OTS','Lockheed Martin','Martin-Baker']},
    f35b:{sys:['F135-PW-600 STOVL Engine','LiftFan System','3-Bearing Swivel Module','AN/APG-81 AESA Radar','DAS/EOTS Sensor Suite','Mission Software Block 4','AN/ASQ-239 EW Suite','HMDS Gen III Helmet','STOVL Ship Interface','ODIN Logistics System'],mfg:['Pratt & Whitney','Rolls-Royce','Rolls-Royce','Northrop Grumman','Northrop Grumman','Lockheed Martin','BAE Systems','Collins Aerospace','BAE Systems','Lockheed Martin']},
    f35a:{sys:['F135-PW-100 Engine','AN/APG-81 AESA Radar','DAS Distributed Aperture System','AN/AAQ-40 EOTS','AN/ASQ-239 EW Suite','Mission Systems Block 4','25mm GAU-22/A Internal Gun','HMDS Gen III Helmet','ALIS/ODIN Logistics','Mk US16E Ejection Seat'],mfg:['Pratt & Whitney','Northrop Grumman','Northrop Grumman','Lockheed Martin','BAE Systems','Lockheed Martin','General Dynamics OTS','Collins Aerospace','Lockheed Martin','Martin-Baker']},
    f22a:{sys:['F119-PW-100 Engine (2x)','AN/APG-77(V)1 AESA Radar','AN/ALR-94 Electronic Warfare','Thrust Vectoring Nozzles','Integrated Avionics Suite','M61A2 20mm Vulcan','Low-Observable Structure','IFDL Intra-Flight Data Link','OBOGS On-Board Oxygen','Environmental Control System'],mfg:['Pratt & Whitney','Northrop Grumman','BAE Systems','Pratt & Whitney','Lockheed Martin','General Dynamics','Lockheed Martin','Lockheed Martin','Honeywell','Hamilton Sundstrand']},
    ah64e:{sys:['T700-GE-701D Engine (2x)','M230E1 30mm Chain Gun','AGM-114 Hellfire Launcher','AN/APG-78 Longbow FCR','M-TADS/PNVS','AN/APR-48B RFI','IHADSS Helmet System','Main Rotor Assembly','Tail Rotor & Stabilator','Link 16 Tactical Data Link'],mfg:['GE Aviation','Northrop Grumman','Lockheed Martin','Northrop Grumman','Lockheed Martin','Northrop Grumman','Elbit Systems','Boeing','Boeing','L3Harris']},
    m1a2_sepv3:{sys:['AGT1500 Gas Turbine Engine','120mm M256A1 Smoothbore Gun','AN/VVS-2(V)2 CTV','M153 CROWS II (RWS)','Trophy APS','FBCB2-JCR (BFT)','NBC Collective Protection','Track & Suspension','Auxiliary Power Unit','Hull/Turret Armor'],mfg:['Honeywell','Rheinmetall/GDLS','DRS Technologies','Kongsberg','Rafael/DRS','General Dynamics C4','GDLS','GDLS','Honeywell','Composite Armor']},
    ch53k:{sys:['T408-GE-400 Engine (3x)','Main Rotor Head (7-blade)','Fly-By-Wire Flight Controls','External Cargo Hook (36,000 lb)','AN/AAQ-29A(V) FLIR','Glass Cockpit/MFDs','Landing Gear System','Fuel System (Internal/External)','Rescue Hoist','APU (T62T-GE-1)'],mfg:['GE Aviation','Sikorsky','Sikorsky/Collins','Sikorsky','Raytheon','L3Harris','Heroux-Devtek','Robertson Fuel','Breeze-Eastern','Honeywell']},
    kc46a:{sys:['PW4062 Engine (2x)','Remote Vision System (RVS)','Wing Aerial Refueling Pod','Fly-By-Wire Boom','Centerline Drogue System','Fuel System (212,000 lbs)','KC-46A Mission Computer','Defensive Systems','Cargo Handling System','Cockpit Avionics'],mfg:['Pratt & Whitney','Rockwell Collins','Cobham','Boeing','Cobham','Boeing','Boeing','Northrop Grumman','Telair','Collins Aerospace']},
    b21:{sys:['Next-Gen Stealth Engine','AESA Radar System','Low-Observable Coating','Mission Computer / Sensor Fusion','EW Suite','Weapons Bay Actuators','Stealth Exhaust System','Navigation/GPS Anti-Jam','Defensive Management System','Environmental Control'],mfg:['(Classified)','Northrop Grumman','Northrop Grumman','Northrop Grumman','(Classified)','Moog','(Classified)','L3Harris','(Classified)','Hamilton Sundstrand']},
    c17:{sys:['F117-PW-100 Engine (4x)','Externally Blown Flap System','463L Cargo Handling System','Aerial Delivery System','Glass Cockpit/HUD','Defensive Systems (AN/AAR-47)','APU (GTCP331-200)','Multi-Wheel Landing Gear','Electronic Flight Control','Cargo Winch (25,000 lb)'],mfg:['Pratt & Whitney','Boeing','Boeing','Airborne Systems','Collins Aerospace','BAE Systems','Honeywell','Boeing','Honeywell','AMSEC']},
    m142_himars:{sys:['M142 Launcher Loader Module','GMLRS Rocket Pod','ATACMS Interface','Fire Control System','FMTV 5-ton Chassis','Nav/Positioning System','SINCGARS/BFT Comms','Hydraulic Launcher System','Cab Protection Kit','Power Distribution Unit'],mfg:['Lockheed Martin','Lockheed Martin','Lockheed Martin','Lockheed Martin','BAE Systems/Oshkosh','Northrop Grumman','Harris Corp','Moog','BAE Systems','Lockheed Martin']},
    patriot:{sys:['AN/MPQ-65A Radar','Engagement Control Station','Launching Station (M903)','PAC-3 MSE Missile','ICC Information & Coord Central','Power Plant (EPP III)','Antenna Mast Group','Communications Relay Group','IBCS Integration','Radar Cooling System'],mfg:['Raytheon','Raytheon','Lockheed Martin','Lockheed Martin','Raytheon','DRS Technologies','Raytheon','Harris Corp','Northrop Grumman','Various']},
    nsc:{sys:['LM2500 Gas Turbine','Mk 110 57mm Gun','20mm Phalanx CIWS','Mk 53 Nulka Decoy','AN/SPS-73(V)18 Radar','RHIB/Stern Launch','Diesel Generator (SSDG)','Damage Control System','Bridge Electronics','Fuel/Ballast System'],mfg:['GE Aviation','BAE Systems','Raytheon','Chemring','Raytheon','SAFE Boats','Caterpillar','Navship','Sperry Marine','Boiler & Tank']},
    gps3:{sys:['GPS III Payload (L1C/A,L2C,L5,M-Code)','Rubidium Atomic Clock','Navigation Signal Generator','Solar Array Wing','Reaction Wheel Assembly','Star Tracker','S-Band Transponder','L-Band Antenna Assembly','Thermal Control','Spacecraft Bus'],mfg:['Lockheed Martin','Microsemi/Excelitas','L3Harris','Lockheed Martin','Honeywell','Ball Aerospace','General Dynamics','Lockheed Martin','Lockheed Martin','Lockheed Martin']}
};

// ═══════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════

// Deterministic hash for consistent random generation
function _hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
}

// Get NSN for a given FSC and platform key
function _genNSN(fsc, key, idx) {
    const h = _hash(key + idx);
    const p2 = String((h % 99) + 1).padStart(2, '0');
    const p3 = String((h % 999) + 1).padStart(3, '0');
    const p4 = String(((h * 7 + idx * 31) % 9999) + 1).padStart(4, '0');
    return fsc + '-' + p2 + '-' + p3 + '-' + p4;
}

// Get components for a platform (explicit or from template)
function getComponents(key) {
    // Check explicit overrides first
    if (COMPONENTS[key]) {
        const c = COMPONENTS[key];
        const tpl = TEMPLATES[DB[key] ? DB[key].c : 'sc'] || TEMPLATES.sc;
        const nsns = c.sys.map((_, i) => _genNSN(tpl.fsc[i] || '5999', key, i));
        return { systems: c.sys, nsns: nsns, mfgs: c.mfg };
    }
    // Fall back to template
    const plat = DB[key];
    if (!plat) return TEMPLATES.sc; // fallback
    const tpl = TEMPLATES[plat.c] || TEMPLATES.sc;
    const nsns = tpl.fsc.map((fsc, i) => _genNSN(fsc, key, i));
    return { systems: tpl.sys, nsns: nsns, mfgs: tpl.mfg };
}

// Get readiness data for a platform
function getReadiness(key) {
    const comp = getComponents(key);
    const plat = DB[key];
    const tpl = TEMPLATES[plat ? plat.c : 'sc'] || TEMPLATES.sc;
    return comp.systems.map((sys, i) => ({
        sys: sys,
        mtbf: tpl.mtbf[i] || 2000,
        mttr: tpl.mttr[i] || 4,
        mldt: tpl.mldt[i] || 36
    }));
}

// Build optgroup HTML for dropdowns
function buildProgramOptions(includeAll, includeCustom) {
    // Group platforms by branch + category
    const groups = {};
    Object.entries(DB).forEach(([key, p]) => {
        if (key === 'custom' && !includeCustom) return;
        const groupKey = p.b + '|' + p.c;
        if (!groups[groupKey]) groups[groupKey] = { branch: BL[p.b] || p.b, cat: CL[p.c] || p.c, items: [] };
        groups[groupKey].items.push({ key: key, name: p.n, po: p.p });
    });

    let html = '';
    if (includeAll) html += '<option value="all">All Programs</option>';

    // Define branch order
    const branchOrder = ['USN','USMC','USA','USAF','USSF','USCG','SOCOM','JOINT'];
    const catOrder = Object.keys(CL);

    branchOrder.forEach(branch => {
        catOrder.forEach(cat => {
            const gk = branch + '|' + cat;
            if (!groups[gk] || groups[gk].items.length === 0) return;
            const g = groups[gk];
            html += '<optgroup label="' + g.branch + ' — ' + g.cat + '">';
            g.items.forEach(item => {
                html += '<option value="' + item.key + '">' + item.name + ' (' + item.po + ')</option>';
            });
            html += '</optgroup>';
        });
    });

    if (includeCustom) {
        html += '<optgroup label="Custom"><option value="custom">Custom Program (define your own)</option></optgroup>';
    }
    return html;
}

// Count platforms
function countPlatforms() { return Object.keys(DB).length; }
function countByBranch() {
    const counts = {};
    Object.values(DB).forEach(p => { counts[p.b] = (counts[p.b] || 0) + 1; });
    return counts;
}

// ═══════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════
window.S4_PLATFORMS = DB;
window.S4_TEMPLATES = TEMPLATES;
window.S4_COMPONENTS = COMPONENTS;
window.S4_BRANCH_LABELS = BL;
window.S4_CAT_LABELS = CL;
window.S4_getComponents = getComponents;
window.S4_getReadiness = getReadiness;
window.S4_buildProgramOptions = buildProgramOptions;
window.S4_countPlatforms = countPlatforms;
window.S4_countByBranch = countByBranch;

})();
