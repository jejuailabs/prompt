// Copy into Assets/Editor in the user's Unity project. No automatic reimport of
// unrelated assets, material substitutions, or Humanoid mapping guesses.
using System;
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEngine;

public static class PlaylabCharacterValidator
{
    // -executeMethod PlaylabCharacterValidator.ValidateBatch
    // -playlabAsset Assets/Character/prepared.fbx -playlabReport /absolute/report.json
    public static void ValidateBatch()
    {
        string asset = null, output = null;
        var args = Environment.GetCommandLineArgs();
        for (int i = 0; i + 1 < args.Length; i++)
        {
            if (args[i] == "-playlabAsset") asset = args[i + 1];
            if (args[i] == "-playlabReport") output = args[i + 1];
        }
        if (string.IsNullOrEmpty(asset) || string.IsNullOrEmpty(output))
            throw new ArgumentException("playlabAsset and playlabReport are required");
        var report = Validate(asset);
        File.WriteAllText(output, JsonUtility.ToJson(report, true));
        EditorApplication.Exit(report.technicalChecksPassed ? 0 : 2);
    }

    [Serializable] public class Report
    {
        public bool unityReady = false;
        public bool technicalChecksPassed;
        public string unityVersion;
        public string assetPath;
        public int triangles;
        public int bones;
        public string[] errors;
        public string[] pending = { "Visual material review", "Walk/jump deformation review", "Design fidelity review" };
    }

    [MenuItem("PLAYLAB/Validate selected character")]
    public static void ValidateSelected()
    {
        var path = AssetDatabase.GetAssetPath(Selection.activeObject);
        var report = Validate(path);
        Debug.Log(JsonUtility.ToJson(report, true));
        EditorUtility.DisplayDialog("PLAYLAB Character QC", report.technicalChecksPassed
            ? "Technical checks passed. Material and motion review are still required."
            : string.Join("\n", report.errors), "OK");
    }

    public static Report Validate(string path)
    {
        var errors = new List<string>();
        var report = new Report { unityVersion = Application.unityVersion, assetPath = path };
        var model = AssetDatabase.LoadAssetAtPath<GameObject>(path);
        if (model == null) errors.Add("Select an imported FBX or prefab.");
        else
        {
            var renderers = model.GetComponentsInChildren<SkinnedMeshRenderer>(true);
            if (renderers.Length == 0) errors.Add("No skinned mesh: this is not an animated character.");
            foreach (var renderer in renderers)
            {
                var mesh = renderer.sharedMesh;
                if (mesh == null) { errors.Add("Missing mesh."); continue; }
                report.triangles += mesh.triangles.Length / 3;
                report.bones += renderer.bones.Length;
                if (mesh.bindposes.Length != renderer.bones.Length) errors.Add("Bone/bindpose mismatch.");
                foreach (var bone in renderer.bones) if (bone == null) errors.Add("Missing bone transform.");
                var weights = mesh.boneWeights;
                if (weights.Length != mesh.vertexCount) errors.Add("Missing vertex weights.");
                foreach (var weight in weights)
                {
                    float sum = weight.weight0 + weight.weight1 + weight.weight2 + weight.weight3;
                    if (float.IsNaN(sum) || float.IsInfinity(sum) || Mathf.Abs(sum - 1f) > 0.02f)
                    { errors.Add("Unweighted or unnormalized vertex."); break; }
                }
                if (mesh.uv.Length != mesh.vertexCount) errors.Add("Missing UVs.");
                foreach (var material in renderer.sharedMaterials)
                    if (material == null || material.shader == null || !material.shader.isSupported || material.shader.name == "Hidden/InternalErrorShader")
                        errors.Add("Missing or incompatible material/shader.");
            }
            var importer = AssetImporter.GetAtPath(path) as ModelImporter;
            if (importer != null && importer.animationType == ModelImporterAnimationType.Human)
            {
                Avatar avatar = null;
                foreach (var asset in AssetDatabase.LoadAllAssetsAtPath(path)) if (asset is Avatar a) avatar = a;
                if (avatar == null || !avatar.isValid || !avatar.isHuman) errors.Add("Invalid Humanoid Avatar.");
            }
        }
        report.errors = errors.ToArray();
        report.technicalChecksPassed = errors.Count == 0;
        return report;
    }
}
