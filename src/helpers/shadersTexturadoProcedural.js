export const vertexShader = `    
    precision highp float;

    #include <common>
    #include <shadowmap_pars_vertex>

    // Atributos de los vértices
    attribute vec3 position; 
    attribute vec3 normal; 
    attribute vec2 uv;     

    // Uniforms
    uniform mat4 modelMatrix;       // Matriz de transformación del objeto
    uniform mat4 worldNormalMatrix; // Matriz de normales
    uniform mat4 viewMatrix;        // Matriz de transformación de la cámara
    uniform mat4 projectionMatrix;  // Matriz de proyección de la cámara

    // Varying
    varying vec2 vUv;       // Coordenadas de textura que se pasan al fragment shader
    varying vec3 vNormal;   // Normal del vértice que se pasa al fragment shader
    varying vec3 vWorldPos; // Posición del vértice en el espacio  de mundo

    void main() {
        // Lee la posición del vértice desde los atributos
        vec3 pos = position;

        // Se calcula la posición final del vértice
        // Se aplica la transformación del objeto, la de la cámara y la de proyección
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(pos, 1.0);

        // Se pasan las coordenadas de textura al fragment shader
        vUv = uv;
        vNormal = normalize(vec3(worldNormalMatrix * vec4(normal, 0.0)));
        vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;

        // Calcula coordenadas de sombra para las luces con shadowMap
        #include <shadowmap_vertex>
    }
`;

export const fragmentShader = `
    precision mediump float;
    #include <common>
    #include <packing>
    #include <shadowmap_pars_fragment>
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    
    uniform float snowThresholdLow;
    uniform float snowThresholdHigh;

    uniform vec3 windDirection;
    uniform vec3 sunDirection;

    uniform sampler2D dirtSampler;
    uniform sampler2D rockSampler;
    uniform sampler2D grassSampler;
    uniform sampler2D sandSampler;
    // thresholds for sand and grass bands
    uniform float sandThresholdLow;
    uniform float sandThresholdHigh;
    uniform float grassThresholdLow;
    uniform float grassThresholdHigh;

    void main(void) {


        vec2 uv=vUv*8.0;
        vec3 grass=texture2D(grassSampler,uv).xyz;
        vec3 dirt=texture2D(dirtSampler,uv*4.0).xyz;                
        vec3 rock=texture2D(rockSampler,uv).xyz;   
        vec3 snow=vec3(1.0,1.0,1.0);     
        
        
        float verticallity=1.0-max(0.0,vNormal.y);
        float flatness=1.0-verticallity;
    float lightIntensity=0.5+0.5*max(0.0,dot(vNormal,sunDirection));
    // Shadow mask (0 = fully shadowed, 1 = lit)
    float shadowMask = 1.0;
    #ifdef USE_SHADOWMAP
    shadowMask = getShadowMask();
    #endif
        

        // Queremos que haya rocas en las zonas más verticales
        float rockFactor=smoothstep(0.3,0.5,verticallity);

        // Que haya mas tierra que pasto donde pegue el viento
        float windFactor=smoothstep(0.5,1.0,dot(vNormal, windDirection));

        // La nieve aparece en las zonas más altas
        float snowFactor=smoothstep(snowThresholdLow,snowThresholdHigh,vWorldPos.y)*smoothstep(0.5,0.8,flatness);

        // mezcla de pasto y tierra
        vec3 grassDirt=mix(grass,dirt,windFactor);

        // mezcla de pasto y tierra con rocas
        vec3 grassDirtRock=mix(grassDirt,rock,rockFactor);
        
        // mezcla de pasto, tierra, rocas y nieve
        vec3 grassDirtRockSnow=mix(grassDirtRock,snow,snowFactor);

        vec3 color=grassDirtRockSnow*lightIntensity*shadowMask;

        gl_FragColor = vec4(color,1.0);	

        //gl_FragColor = vec4(grassDirt,1.0);		
        //gl_FragColor = vec4(grassDirtRock,1.0);		
        //gl_FragColor = vec4(grassDirtRockSnow,1.0);		

        //gl_FragColor = vec4(rockFactor,rockFactor,rockFactor,1.0);	
        //gl_FragColor = vec4(windFactor,windFactor,windFactor,1.0);	

        //gl_FragColor = vec4(grassSnow,1.0);		
        //gl_FragColor = vec4(windIncidense,windIncidense,windIncidense,1.0);
        //gl_FragColor = vec4(vNormal,1.0);		
    
    }
    `;

// A variant of the fragment shader that replaces the snow band with a
// rocky peak and a surrounding dirt band. It exposes explicit thresholds
// so you can control where rock and dirt appear by height.
export const fragmentShaderRocky = `
    precision mediump float;
    #include <common>
    #include <packing>
    #include <shadowmap_pars_fragment>
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPos;

    // Height thresholds to control where dirt/rock appear
    uniform float rockThresholdLow;   // start of rock influence
    uniform float rockThresholdHigh;  // full rock at/above this
    uniform float dirtThresholdLow;   // start of dirt influence
    uniform float dirtThresholdHigh;  // full dirt at/above this
    uniform float sandThresholdLow;
    uniform float sandThresholdHigh;
    uniform float grassThresholdLow;
    uniform float grassThresholdHigh;
    
    uniform vec3 windDirection;
    uniform vec3 sunDirection;

    uniform sampler2D dirtSampler;
    uniform sampler2D rockSampler;
    uniform sampler2D grassSampler;
    uniform sampler2D sandSampler;

    void main(void) {

        vec2 uv = vUv * 8.0;
        vec3 grass = texture2D(grassSampler, uv).xyz;
        vec3 dirt = texture2D(dirtSampler, uv * 4.0).xyz;
        vec3 rock = texture2D(rockSampler, uv).xyz;
        vec3 sand = texture2D(sandSampler, uv * 6.0).xyz;

        // geometry-based factors
        float verticallity = 1.0 - max(0.0, vNormal.y);
        float flatness = 1.0 - verticallity;
    float lightIntensity = 0.5 + 0.5 * max(0.0, dot(vNormal, sunDirection));
    float shadowMask = 1.0;
    #ifdef USE_SHADOWMAP
    shadowMask = getShadowMask();
    #endif

        // Height-based bands
        float rockHeight = smoothstep(rockThresholdLow, rockThresholdHigh, vWorldPos.y);
        float dirtHeight = smoothstep(dirtThresholdLow, dirtThresholdHigh, vWorldPos.y);
        float grassHeight = smoothstep(grassThresholdLow, grassThresholdHigh, vWorldPos.y);
        float sandHeight = smoothstep(sandThresholdLow, sandThresholdHigh, vWorldPos.y);

        // Adjust sand to fade out more aggressively at mid-levels
        float sandFactor = clamp(sandHeight * (1.0 - rockHeight) * (1.0 - grassHeight * 0.8), 0.0, 1.0);

        // Grass should dominate mid-levels, fade near peaks and low levels
        float grassFactor = clamp(grassHeight * (1.0 - rockHeight) * (1.0 - sandFactor * 0.5), 0.0, 1.0);

        // Dirt should appear near peaks, fade below grass and sand
        float dirtFactor = clamp(dirtHeight * (1.0 - rockHeight * 1.2) * (1.0 - grassFactor * 0.7), 0.0, 1.0);

        // Rock should dominate at steep slopes and highest elevations
        float slopeRock = smoothstep(0.35, 0.75, verticallity);
        float rockFactor = max(rockHeight, slopeRock * 0.85);

        // Mix grass + dirt by wind and height band, then apply grass banding
        vec3 grassDirt = mix(grass, dirt, clamp(dirtFactor * 0.9 + grassFactor * 0.7, 0.0, 1.0));

        // Blend sand into the base (sand appears closer to low-elevation areas)
        vec3 baseWithSand = mix(grassDirt, sand, sandFactor);

        // Blend rock on top of the sand/grass/dirt base
        vec3 base = mix(baseWithSand, rock, rockFactor);

        // Slight enhancement of color by light
        vec3 color = base * lightIntensity * shadowMask;

        gl_FragColor = vec4(color, 1.0);
    }
`;

export const fragmentShaderBands = `
    precision mediump float;
    #include <common>
    #include <packing>
    #include <shadowmap_pars_fragment>
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPos;

    // Height thresholds for texture bands
    uniform float sandStart;
    uniform float sandEnd;
    uniform float grassStart;
    uniform float grassEnd;
    uniform float dirtStart;
    uniform float dirtEnd;
    uniform float rockStart;
    uniform float rockEnd;

    // Wind and light direction
    uniform vec3 windDirection;
    uniform vec3 sunDirection;

    // Texture samplers
    uniform sampler2D sandSampler;
    uniform sampler2D grassSampler;
    uniform sampler2D dirtSampler;
    uniform sampler2D rockSampler;

    void main(void) {
        vec2 uv = vUv * 8.0;
        vec3 sand = texture2D(sandSampler, uv * 6.0).xyz;
        vec3 grass = texture2D(grassSampler, uv).xyz;
        vec3 dirt = texture2D(dirtSampler, uv * 4.0).xyz;
        vec3 rock = texture2D(rockSampler, uv).xyz;

        // Geometry-based factors
        float verticallity = 1.0 - max(0.0, vNormal.y);
    float lightIntensity = 0.5 + 0.5 * max(0.0, dot(vNormal, sunDirection));
    float shadowMask = 1.0;
    #ifdef USE_SHADOWMAP
    shadowMask = getShadowMask();
    #endif

        // Height-based bands
        float sandFactor = smoothstep(sandStart, sandEnd, vWorldPos.y);
        float grassFactor = smoothstep(grassStart, grassEnd, vWorldPos.y);
        float dirtFactor = smoothstep(dirtStart, dirtEnd, vWorldPos.y);
        float rockFactor = smoothstep(rockStart, rockEnd, vWorldPos.y);

        // Adjust rock and dirt based on verticality
        rockFactor = max(rockFactor, smoothstep(0.35, 0.75, verticallity));
        dirtFactor *= (1.0 - rockFactor);

        // Wind influence on dirt
        float windFactor = smoothstep(0.5, 1.0, dot(vNormal, windDirection));
        dirtFactor = mix(dirtFactor, dirtFactor * 1.2, windFactor);

        // Blend textures
        vec3 sandGrass = mix(sand, grass, grassFactor);
        vec3 grassDirt = mix(sandGrass, dirt, dirtFactor);
        vec3 finalBase = mix(grassDirt, rock, rockFactor);

        // Apply lighting
        vec3 color = finalBase * lightIntensity * shadowMask;

        gl_FragColor = vec4(color, 1.0);
    }
`;
