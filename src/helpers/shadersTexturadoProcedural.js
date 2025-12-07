export const vertexShader = `    
    precision highp float;

    // Atributos de los vértices
    attribute vec3 position; 	
    attribute vec3 normal; 	
    attribute vec2 uv;		 	

    // Uniforms
    uniform mat4 modelMatrix;		// Matriz de transformación del objeto
    uniform mat4 worldNormalMatrix;	// Matriz de normales
    uniform mat4 viewMatrix;		// Matriz de transformación de la cámara
    uniform mat4 projectionMatrix;	// Matriz de proyección de la cámara

    // Varying
    varying vec2 vUv;	    // Coordenadas de textura que se pasan al fragment shader
    varying vec3 vNormal;	// Normal del vértice que se pasa al fragment shader
    varying vec3 vWorldPos;	// Posición del vértice en el espacio  de mundo

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
    }
`;

export const fragmentShader = `
    precision mediump float;
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

    void main(void) {


        vec2 uv=vUv*8.0;
        vec3 grass=texture2D(grassSampler,uv).xyz;
        vec3 dirt=texture2D(dirtSampler,uv*4.0).xyz;                
        vec3 rock=texture2D(rockSampler,uv).xyz;   
        vec3 snow=vec3(1.0,1.0,1.0);     
        
        
        float verticallity=1.0-max(0.0,vNormal.y);
        float flatness=1.0-verticallity;
        float lightIntensity=0.5+0.5*max(0.0,dot(vNormal,sunDirection));
        

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

        vec3 color=grassDirtRockSnow*lightIntensity;

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
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPos;

    // Height thresholds to control where dirt/rock appear
    uniform float rockThresholdLow;   // start of rock influence
    uniform float rockThresholdHigh;  // full rock at/above this
    uniform float dirtThresholdLow;   // start of dirt influence
    uniform float dirtThresholdHigh;  // full dirt at/above this

    // Heightmap used both to displace geometry and to generate per-pixel normals
    uniform sampler2D heightSampler;
    uniform float heightScale; // same vertical scale used to displace vertices
    uniform float normalStrength; // how strong the normal-map perturbation is
    // texel size of the heightmap and world terrain size (used to convert UV derivatives to world units)
    uniform vec2 heightMapTexelSize;
    uniform vec2 terrainSize;

    uniform vec3 windDirection;
    uniform vec3 sunDirection;

    uniform sampler2D dirtSampler;
    uniform sampler2D rockSampler;
    uniform sampler2D grassSampler;

    void main(void) {

    vec2 uv = vUv * 8.0;
    vec3 grass = texture2D(grassSampler, uv).xyz;
    vec3 dirt = texture2D(dirtSampler, uv * 4.0).xyz;
    vec3 rock = texture2D(rockSampler, uv).xyz;

    // --- normal mapping from heightmap (per-pixel) using finite differences ---
    // Sample neighboring texels to approximate derivatives. Expects the following uniforms:
    // heightMapTexelSize = vec2(1.0/texWidth, 1.0/texHeight)
    // terrainSize = vec2(worldWidth, worldHeight)
    vec2 texel = heightMapTexelSize;
    float hL = texture2D(heightSampler, vUv - vec2(texel.x, 0.0)).r;
    float hR = texture2D(heightSampler, vUv + vec2(texel.x, 0.0)).r;
    float hD = texture2D(heightSampler, vUv - vec2(0.0, texel.y)).r;
    float hU = texture2D(heightSampler, vUv + vec2(0.0, texel.y)).r;

    // derivative with respect to UV coords
    float dhdu = (hR - hL) * 0.5 / texel.x;
    float dhdv = (hU - hD) * 0.5 / texel.y;

    // convert to world-space derivatives: dh/dx_world = dh/du * (heightScale / terrainWidth)
    float dhdx_world = dhdu * (heightScale / terrainSize.x) * normalStrength;
    float dhdy_world = dhdv * (heightScale / terrainSize.y) * normalStrength;

    // Build a tangent/bitangent basis from the interpolated geometric normal
    vec3 n_geo = normalize(vNormal);
    vec3 tangent = normalize(cross(vec3(0.0, 1.0, 0.0), n_geo));
    if (length(tangent) < 0.0001) tangent = vec3(1.0, 0.0, 0.0);
    vec3 bitangent = normalize(cross(n_geo, tangent));

    // Build a tangent-space normal from world derivatives and transform to world space
    vec3 n_tspace = normalize(vec3(-dhdx_world, 1.0, -dhdy_world));
    vec3 perturbedNormal = normalize(n_tspace.x * tangent + n_tspace.y * n_geo + n_tspace.z * bitangent);

        // geometry-based factors
    // use perturbedNormal for lighting evaluations
    float verticallity = 1.0 - max(0.0, perturbedNormal.y);
    float flatness = 1.0 - verticallity;
    float lightIntensity = 0.5 + 0.5 * max(0.0, dot(perturbedNormal, sunDirection));

        // Height-based bands
        float rockHeight = smoothstep(rockThresholdLow, rockThresholdHigh, vWorldPos.y);
        float dirtHeight = smoothstep(dirtThresholdLow, dirtThresholdHigh, vWorldPos.y);

        // Make steeper slopes rockier as well
        float slopeRock = smoothstep(0.35, 0.75, verticallity);

        // Final rock factor: combine height and slope influence
        float rockFactor = max(rockHeight, slopeRock * 0.85);

        // Dirt should appear in a band below/around the rocky peak. Reduce dirt where rock dominates.
        float dirtFactor = clamp(dirtHeight * (1.0 - rockFactor * 1.2), 0.0, 1.0);

        // Wind can favor dirt over grass on exposed areas
        float windFactor = smoothstep(0.5, 1.0, dot(vNormal, windDirection));

        // Mix grass + dirt by wind and height band
        vec3 grassDirt = mix(grass, dirt, clamp(windFactor * 0.7 + dirtFactor * 0.9, 0.0, 1.0));

        // Blend rock on top of the grass/dirt base
        vec3 base = mix(grassDirt, rock, rockFactor);

        // Slight enhancement of color by light
        vec3 color = base * lightIntensity;

        gl_FragColor = vec4(color, 1.0);
    }
`;
