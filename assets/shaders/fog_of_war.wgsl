#import bevy_sprite::mesh2d_vertex_output::VertexOutput

struct FogParams {
    fog_color: vec4<f32>,
    params1: vec4<f32>,   // x = edge_width, y = time, z = noise_strength, w = unused
    uv_scale: vec4<f32>,  // xy used, zw unused
};

@group(2) @binding(0) var<uniform> params: FogParams;
@group(2) @binding(1) var explored_texture: texture_2d<f32>;
@group(2) @binding(2) var explored_sampler: sampler;
@group(2) @binding(3) var noise_texture: texture_2d<f32>;
@group(2) @binding(4) var noise_sampler: sampler;
@group(2) @binding(5) var unit_visible_texture: texture_2d<f32>;
@group(2) @binding(6) var unit_visible_sampler: sampler;

@fragment
fn fragment(mesh: VertexOutput) -> @location(0) vec4<f32> {
    let uv = mesh.uv;

    let edge_width = params.params1.x;
    let time = params.params1.y;
    let noise_strength = params.params1.z;

    // Remap UVs
    let explored_uv = (uv - 0.5) * params.uv_scale.xy + 0.5;

    // Outside bounds = full fog
    let in_bounds =
        explored_uv.x >= 0.0 && explored_uv.x <= 1.0 &&
        explored_uv.y >= 0.0 && explored_uv.y <= 1.0;

    let explored =
        select(0.0,
               textureSample(explored_texture, explored_sampler, explored_uv).r,
               in_bounds);

    let unit_visible =
        select(0.0,
               textureSample(unit_visible_texture, unit_visible_sampler, explored_uv).r,
               in_bounds);

    let combined = max(explored, unit_visible);

    // Animated noise
    let noise_uv1 = uv * 4.0 + vec2<f32>(time * 0.02, time * 0.015);
    let noise_uv2 = uv * 6.0 + vec2<f32>(-time * 0.015, time * 0.025);

    let noise1 = textureSample(noise_texture, noise_sampler, fract(noise_uv1)).r;
    let noise2 = textureSample(noise_texture, noise_sampler, fract(noise_uv2)).r;

    let noise = (noise1 + noise2) * 0.5;

    // Distort boundary
    let distorted_explored =
        combined + (noise - 0.5) * noise_strength;

    // Smooth fog edge
    let fog_alpha =
        1.0 - smoothstep(
            0.3 - edge_width,
            0.3 + edge_width,
            distorted_explored
        );

    if fog_alpha < 0.01 {
        discard;
    }

    return vec4<f32>(
        params.fog_color.rgb,
        params.fog_color.a * fog_alpha
    );
}
