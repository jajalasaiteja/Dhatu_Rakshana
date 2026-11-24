# Dhatu Rakshana v3 - report
Generated 2026-11-13 10:50:48 UTC

## Stage 1 detector (yolov8m.pt, 181.7 min) - class `defect`, target AP50 >= 0.9
* all/val: AP50 0.7199, AP50-95 0.3449, P 0.6892, R 0.6589, n=4093
* all/test: AP50 0.7017, AP50-95 0.3332, P 0.6829, R 0.6395, n=4616  **NOT MET**
* roboflow/val: AP50 0.7204, AP50-95 0.3443, P 0.6681, R 0.6721, n=3876
* roboflow/test: AP50 0.6964, AP50-95 0.3297, P 0.6529, R 0.6454, n=4379  **NOT MET**
* zenodo/val: AP50 0.7590, AP50-95 0.3676, P 0.7956, R 0.7177, n=217
* zenodo/test: AP50 0.7572, AP50-95 0.3758, P 0.8535, R 0.7595, n=237  **NOT MET**

### Detector diagnosis on val tiles (conf>=0.1); verdict: **ok**
* Recall at IoU 0.3 is >= 80% and boxes are not systematically loose.
  * roboflow: 3876 GT boxes | recall@IoU0.5 82.5% | recall@IoU0.3 86.1% | precision@0.5 42.6% | precision@0.3 44.5% | boxes <16px 6%
  * zenodo: 217 GT boxes | recall@IoU0.5 83.9% | recall@IoU0.3 87.1% | precision@0.5 51.3% | precision@0.3 53.2% | boxes <16px 0%
* hi-res fine-tune: skipped (see verdict above)

## Stage 2 classifier (resnet34, 49.3 min, best epoch 21, T=0.596)
* test accuracy 93.74% (95% CI 92.88-94.52) ; macro-F1 0.9396 (95% CI 0.9191-0.9543)
* target macro-F1 >= 0.95: point estimate **NOT MET**, lower CI bound **NOT MET**
  * contamination: P 97.7% R 93.5% F1 95.5% (n=9056)
  * inclusion: P 81.6% R 92.0% F1 86.5% (n=2892)
  * no_defect: P 98.0% R 98.3% F1 98.1% (n=1259)
  * pinhole: P 93.4% R 93.8% F1 93.6% (n=289)
  * scratch: P 93.5% R 98.7% F1 96.0% (n=379)
  * domain roboflow: n=13000 acc 93.7% macro-F1 0.945 support [9050, 2805, 500, 286, 359]
  * domain zenodo: n=875 acc 95.0% macro-F1 0.654 support [6, 87, 759, 3, 20]

## End-to-end on held-out test (op. point det_conf>=0.25, reject>=0.5, chosen on val)
* IoU 0.3 / roboflow: recall 69.5%, precision(mix) 76.2%, subtype acc 92.9%, FP per clean image 0.000
* IoU 0.3 / zenodo: recall 71.6%, precision(mix) 50.3%, subtype acc 85.5%, FP per clean image 0.027
* IoU 0.5 / roboflow: recall 62.5%, precision(mix) 68.5%, subtype acc 93.4%, FP per clean image 0.000
* IoU 0.5 / zenodo: recall 60.3%, precision(mix) 42.4%, subtype acc 84.3%, FP per clean image 0.027